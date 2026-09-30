import { useEffect, useRef, useState } from "react";
import { brandKey, renderCached, resizeTo } from "../lib/render";
import type { Brand, Glyph } from "../lib/types";
import { useData } from "../state";

interface Props {
  glyph: Glyph;
  brand: Brand;
  /** Display size in CSS pixels. */
  size: number;
  /** Use the 256 px source (grids) instead of the 1024 px master. */
  thumb?: boolean;
  /** Show the generated version even when an official icon exists. */
  force?: boolean;
}

export function IconCanvas({ glyph, brand, size, thumb = true, force = false }: Props) {
  const { roles } = useData();
  const ref = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const key = brandKey(brand);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    renderCached(glyph, brand, roles, thumb, force)
      .then(({ bitmap }) => {
        const c = ref.current;
        if (!alive || !c) return;
        const px = Math.round(size * Math.min(window.devicePixelRatio || 1, 2));
        c.width = px;
        c.height = px;
        const x = c.getContext("2d");
        if (!x) return;
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "high";
        x.clearRect(0, 0, px, px);
        x.drawImage(bitmap.width / 2 >= px ? resizeTo(bitmap, px) : bitmap, 0, 0, px, px);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
    // glyph and brand are captured through their id and color key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph.id, key, thumb, force, size, roles]);

  return (
    <span className={`icon icon-${status}`} style={{ width: size, height: size }}>
      <canvas ref={ref} role="img" aria-label={`${glyph.nama}, ${brand.name}`} style={{ width: size, height: size }} />
      {status === "error" && <span className="icon-error">gagal dimuat</span>}
    </span>
  );
}
