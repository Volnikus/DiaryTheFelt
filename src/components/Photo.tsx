import Image from "next/image";
import type { CSSProperties } from "react";

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
}

export function Photo({ src, alt, width, height, sizes, className, style, priority }: Props) {
  if (src.startsWith("/demo/")) {
    return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} style={style} priority={priority} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img decoding="async" loading={priority ? "eager" : "lazy"} src={src} alt={alt} width={width} height={height} className={className} style={style} />
  );
}
