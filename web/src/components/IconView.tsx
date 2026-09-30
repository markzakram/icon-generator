import { useMemo } from "react";
import { brandKey, displayName, effectiveVersion } from "../lib/render";
import type { Brand, Glyph, Version } from "../lib/types";
import { badgeKey, type Badge } from "../lib/v2/badges";
import { V2_BY_ID } from "../lib/v2/glyphs";
import { badgeSvg, SIMPLE_MAX, svgDataUrl, v2Svg } from "../lib/v2/svg";
import { v2Tokens } from "../lib/v2/tokens";
import { IconCanvas } from "./IconCanvas";

interface Props {
  glyph: Glyph;
  brand: Brand;
  size: number;
  version: Version;
  /** v1 only: generated drawing even when an official icon exists. */
  force?: boolean;
  badge?: Badge | null;
  /** v1 only: use the 256 px source (grids). */
  thumb?: boolean;
  /** Force the simple v2 drawing (otherwise automatic at 48 px and below). */
  simple?: boolean;
}

/** v2 icons render as crisp vector images; v1 icons as a canvas, with the badge laid on top. */
export function IconView({ glyph, brand, size, version, force = false, badge, thumb = true, simple }: Props) {
  const v = effectiveVersion(glyph, version);
  const key = brandKey(brand);
  const bKey = badgeKey(badge);
  const useSimple = simple ?? size <= SIMPLE_MAX;
  const tokens = useMemo(() => v2Tokens(brand), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const url = useMemo(() => {
    const def = v === "v2" ? V2_BY_ID.get(glyph.id) : undefined;
    return def ? svgDataUrl(v2Svg(def, tokens, { size, simple: useSimple, badge })) : null;
  }, [v, glyph.id, tokens, size, useSimple, bKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const badgeUrl = useMemo(
    () => (v === "v1" && badge ? svgDataUrl(badgeSvg(badge, tokens, size)) : null),
    [v, tokens, size, bKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const label = `${displayName(glyph, version)}, ${brand.name}`;

  if (url) {
    return <img className="icon-img" src={url} width={size} height={size} alt={label} draggable={false} />;
  }
  return (
    <span className="icon-stack" style={{ width: size, height: size }}>
      <IconCanvas glyph={glyph} brand={brand} size={size} thumb={thumb} force={force} />
      {badgeUrl && <img className="icon-badge" src={badgeUrl} width={size} height={size} alt="" aria-hidden />}
    </span>
  );
}
