import type { MusicProvider } from "./types.ts";

export interface ParsedLink {
  provider: MusicProvider;
  url: string;
  embedUrl: string | null;
  oembed: string | null;
}

export function parseMusicLink(raw: string): ParsedLink | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const url = u.toString();

  if (host === "open.spotify.com") {
    const m = u.pathname.match(/\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    if (!m) return null;
    return {
      provider: "spotify",
      url,
      embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
      oembed: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
    };
  }
  if (host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|embed)\/([\w-]{6,})/)?.[1];
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    const watch = `https://www.youtube.com/watch?v=${id}`;
    return {
      provider: "youtube",
      url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      oembed: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
    };
  }
  if (host === "soundcloud.com") {
    if (u.pathname.split("/").filter(Boolean).length < 2) return null;
    return {
      provider: "soundcloud",
      url,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&visual=false&show_comments=false`,
      oembed: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    };
  }
  if (host === "music.apple.com") {
    return { provider: "apple", url, embedUrl: `https://embed.music.apple.com${u.pathname}${u.search}`, oembed: null };
  }
  if (host.endsWith("bandcamp.com")) {
    return { provider: "bandcamp", url, embedUrl: null, oembed: null };
  }
  return { provider: "other", url, embedUrl: null, oembed: null };
}

export const PROVIDER_LABEL: Record<MusicProvider, string> = {
  spotify: "Spotify", youtube: "YouTube", soundcloud: "SoundCloud", apple: "Apple Music", bandcamp: "Bandcamp", other: "Link",
};
