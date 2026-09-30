import { useMemo, type CSSProperties } from "react";
import { svgDataUrl } from "../lib/v2/svg";

/** Shows an SVG document as an image (no markup is injected into the page). */
export function SvgImg({ svg, alt, className, style }: { svg: string; alt: string; className?: string; style?: CSSProperties }) {
  const src = useMemo(() => svgDataUrl(svg), [svg]);
  return <img src={src} alt={alt} className={className} style={style} draggable={false} />;
}
