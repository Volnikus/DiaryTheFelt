export function Waveform({ envelope, color, height = 28, progress, className }: { envelope: number[]; color: string; height?: number; progress?: number; className?: string }) {
  const n = envelope.length;
  return (
    <svg viewBox={`0 0 ${n * 4} ${height}`} preserveAspectRatio="none" className={className} style={{ width: "100%", height }} aria-hidden>
      {envelope.map((v, i) => {
        const bh = Math.max(1.5, v * height);
        const played = progress !== undefined && i / n <= progress;
        return <rect key={i} x={i * 4} y={(height - bh) / 2} width={2.2} height={bh} rx={1} fill={color} opacity={progress === undefined ? 0.85 : played ? 1 : 0.32} />;
      })}
    </svg>
  );
}
