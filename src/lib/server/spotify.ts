import "server-only";
import type { TrackHit } from "../types";

// Song search for the "Find a song" panel and for checking AI picks against a real catalogue.
// Spotify Web API (client-credentials flow) when SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET are set;
// otherwise the public iTunes catalogue, with each result linked to the same search on Spotify.


export const spotifyEnabled = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (!spotifyEnabled()) return null;
  if (token && token.expires > Date.now() + 30_000) return token.value;
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    console.error("[spotify:token]", res.status);
    return null;
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

interface SpotifyTrack {
  id: string;
  name: string;
  explicit: boolean;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number }[] };
}

async function searchSpotify(q: string, limit: number): Promise<TrackHit[] | null> {
  const t = await accessToken();
  if (!t) return null;
  const url = `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${t}` }, signal: AbortSignal.timeout(6000) });
  if (res.status === 401) token = null;
  if (!res.ok) {
    console.error("[spotify:search]", res.status);
    return null;
  }
  const j = (await res.json()) as { tracks?: { items: SpotifyTrack[] } };
  return (j.tracks?.items ?? []).map((tr) => {
    const imgs = [...tr.album.images].sort((a, b) => a.width - b.width);
    return {
      id: tr.id,
      title: tr.name,
      artist: tr.artists.map((a) => a.name).join(", "),
      album: tr.album.name,
      image: (imgs.find((i) => i.width >= 200) ?? imgs.at(-1))?.url ?? null,
      url: tr.external_urls.spotify,
      embedUrl: `https://open.spotify.com/embed/track/${tr.id}`,
      spotifyUrl: tr.external_urls.spotify,
      previewUrl: tr.preview_url,
      durationMs: tr.duration_ms,
      explicit: tr.explicit,
      source: "spotify" as const,
    };
  });
}

interface ItunesTrack {
  trackId: number;
  trackName: string;
  trackViewUrl: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackExplicitness?: string;
}

async function searchItunes(q: string, limit: number): Promise<TrackHit[]> {
  const url = `https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(q)}`;
  let res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const j = (await res.json()) as { results: ItunesTrack[] };
  return j.results.map((tr) => ({
    id: String(tr.trackId),
    title: tr.trackName,
    artist: tr.artistName,
    album: tr.collectionName ?? null,
    image: tr.artworkUrl100?.replace("100x100", "300x300") ?? null,
    url: tr.trackViewUrl.replace(/[?&]uo=\d+/, ""),
    embedUrl: tr.trackViewUrl.replace("https://music.apple.com", "https://embed.music.apple.com").replace(/[?&]uo=\d+/, ""),
    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${tr.trackName} ${tr.artistName}`)}`,
    previewUrl: tr.previewUrl ?? null,
    durationMs: tr.trackTimeMillis ?? null,
    explicit: tr.trackExplicitness === "explicit",
    source: "itunes" as const,
  }));
}

// Same searches come up again and again (and every AI song pick is checked) — keep results for a day.
const cache = new Map<string, { at: number; value: { provider: "spotify" | "itunes"; tracks: TrackHit[] } }>();
const DAY = 24 * 60 * 60 * 1000;

export async function searchTracks(q: string, limit = 8): Promise<{ provider: "spotify" | "itunes"; tracks: TrackHit[] }> {
  const query = q.replace(/\s+/g, " ").trim().slice(0, 200);
  const key = `${query.toLowerCase()}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.value;
  const value = await searchUncached(query, limit);
  if (value.tracks.length) {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  }
  return value;
}

async function searchUncached(query: string, limit: number): Promise<{ provider: "spotify" | "itunes"; tracks: TrackHit[] }> {
  const fromSpotify = await searchSpotify(query, limit).catch(() => null);
  if (fromSpotify) return { provider: "spotify", tracks: fromSpotify };
  return { provider: "itunes", tracks: await searchItunes(query, limit).catch(() => []) };
}
