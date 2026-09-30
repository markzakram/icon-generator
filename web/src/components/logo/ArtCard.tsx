import { useState, type ReactNode } from "react";
import { copyImage, downloadBlob, downloadText } from "../../lib/download";
import type { SvgOut } from "../../lib/logo/compose";
import { pngAtHeight } from "../../lib/logo/export";
import { SvgImg } from "../SvgImg";

export type ArtBg = "terang" | "gelap" | "kotak";

/** One rendering of the logo with quick SVG / PNG / copy actions. */
export function ArtCard({
  title,
  make,
  file,
  pngHeight,
  bg = "terang",
  stageColor,
  className = "",
  children,
}: {
  title: string;
  /** Builds the artwork; with a height it carries pixel size for PNG export. */
  make: (h?: number) => SvgOut;
  file: string;
  pngHeight: number;
  bg?: ArtBg;
  /** Solid stage color instead of a preset background (e.g. the brand color under the white logo). */
  stageColor?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [note, setNote] = useState<string | null>(null);
  const art = make();

  const flash = (t: string) => {
    setNote(t);
    window.setTimeout(() => setNote(null), 2200);
  };

  return (
    <figure className={`art ${className}`}>
      <div className={`art-stage art-${bg}`} style={stageColor ? { background: stageColor } : undefined}>
        <SvgImg svg={art.svg} alt={title} />
      </div>
      <figcaption>
        <span className="art-title">{note ?? title}</span>
        <span className="art-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => downloadText(art.svg, `${file}.svg`, "image/svg+xml")}>
            SVG
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={async () => downloadBlob(await pngAtHeight((h) => make(h), pngHeight), `${file}_h${pngHeight}.png`)}
          >
            PNG
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={async () => flash((await copyImage(await pngAtHeight((h) => make(h), pngHeight))) ? "Gambar disalin" : "Browser menolak menyalin")}
          >
            Salin
          </button>
        </span>
      </figcaption>
      {children}
    </figure>
  );
}
