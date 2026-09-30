"""Final checks for catalog/glyphs.json. Exit code 0 = all checks passed.

Checks
  1. valid UTF-8 JSON with the expected top-level shape (version 1, dibuat, glyphs, unassigned=[]);
  2. every PNG under the 14 brand folders appears exactly once in instances, and nothing else does
     (paths compared byte-exact, so trailing spaces and case matter);
  3. every instance path exists and its `brand` equals the first path component;
  4. ids unique and snake_case; logos are `logo_*` with tipe/kategori `logo`; kategori and tipe valid;
  5. required fields present; sinonim: 8-15 for glyphs, >= 3 for logos, no empty/duplicate terms;
     alias lowercased and de-duplicated; brands = ordered unique brands of the instances;
  6. glyphs sorted by number of brands (desc) then id;
  7. the 16 seed glyphs exist and contain every seed instance (extra instances allowed);
  8. review sheets exist for every kategori in use, and SUMMARY.md exists.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (BRANDS, CATALOG_DIR, GLYPHS_PATH, REVIEW_DIR, SEED16, SEED_PATH,  # noqa: E402
                    abs_path, list_pngs)
from glyph_meta import KATEGORI  # noqa: E402

SNAKE = re.compile(r"^[a-z][a-z0-9]*(_[a-z0-9]+)*$")
REQUIRED = ["id", "nama", "kategori", "tipe", "alias", "sinonim", "deskripsi_visual", "brands", "instances"]


def main() -> int:
    errors: list[str] = []
    warns: list[str] = []
    ok: list[str] = []

    # 1. JSON shape
    raw = GLYPHS_PATH.read_bytes()
    try:
        cat = json.loads(raw.decode("utf-8"))            # strict UTF-8 decode
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        print(f"FAIL: glyphs.json is not valid UTF-8 JSON: {e}")
        return 1
    if raw.startswith(b"\xef\xbb\xbf"):
        errors.append("glyphs.json starts with a UTF-8 BOM")
    if set(cat) != {"version", "dibuat", "glyphs", "unassigned"}:
        errors.append(f"unexpected top-level keys: {sorted(cat)}")
    if cat.get("version") != 1:
        errors.append("version != 1")
    if cat.get("dibuat") != "2026-09-30":
        errors.append(f"dibuat = {cat.get('dibuat')!r}")
    if cat.get("unassigned") != []:
        errors.append(f"unassigned is not empty: {cat.get('unassigned')}")
    glyphs = cat.get("glyphs", [])
    ok.append(f"valid UTF-8 JSON, {len(glyphs)} entries")

    # 2./3. coverage and paths
    on_disk = list_pngs()
    disk_set = set(on_disk)
    seen: dict[str, str] = {}
    for g in glyphs:
        for it in g.get("instances", []):
            f = it.get("file", "")
            if f in seen:
                errors.append(f"{f!r} appears twice ({seen[f]}, {g.get('id')})")
            seen[f] = g.get("id")
            if f not in disk_set:
                errors.append(f"{g.get('id')}: {f!r} is not an exact source PNG path")
            if not abs_path(f).is_file():
                errors.append(f"{g.get('id')}: {f!r} does not exist")
            if it.get("brand") != f.split("/", 1)[0]:
                errors.append(f"{f!r}: brand {it.get('brand')!r} does not match path")
            if it.get("brand") not in BRANDS:
                errors.append(f"{f!r}: unknown brand {it.get('brand')!r}")
            extra = set(it) - {"brand", "file", "varian"}
            if extra:
                errors.append(f"{f!r}: unexpected instance keys {sorted(extra)}")
            if "varian" in it and not str(it["varian"]).strip():
                errors.append(f"{f!r}: empty varian note")
    missing = [f for f in on_disk if f not in seen]
    if missing:
        errors.append(f"{len(missing)} source PNG(s) not in any glyph: {missing[:10]}")
    if len(on_disk) != 510:
        warns.append(f"expected 510 source PNGs on disk, found {len(on_disk)}")
    if not missing and len(seen) == len(on_disk):
        ok.append(f"all {len(on_disk)} PNG paths appear exactly once and exist")

    # 4./5. ids and fields
    ids = [g.get("id") for g in glyphs]
    dup_ids = sorted({i for i in ids if ids.count(i) > 1})
    if dup_ids:
        errors.append(f"duplicate ids: {dup_ids}")
    for g in glyphs:
        gid = g.get("id", "?")
        for k in REQUIRED:
            if k not in g:
                errors.append(f"{gid}: missing field {k}")
        if set(g) - set(REQUIRED):
            errors.append(f"{gid}: unexpected fields {sorted(set(g) - set(REQUIRED))}")
        if not SNAKE.match(str(gid)):
            errors.append(f"{gid}: id is not snake_case")
        if g.get("kategori") not in KATEGORI:
            errors.append(f"{gid}: invalid kategori {g.get('kategori')!r}")
        if g.get("tipe") not in ("glyph", "logo"):
            errors.append(f"{gid}: invalid tipe {g.get('tipe')!r}")
        is_logo = g.get("tipe") == "logo"
        if is_logo != str(gid).startswith("logo_") or is_logo != (g.get("kategori") == "logo"):
            errors.append(f"{gid}: logo id / tipe / kategori are inconsistent")
        for k in ("nama", "deskripsi_visual"):
            if not str(g.get(k, "")).strip():
                errors.append(f"{gid}: empty {k}")
        sin = g.get("sinonim", [])
        lo, hi = (3, 99) if is_logo else (8, 15)
        if not (lo <= len(sin) <= hi):
            errors.append(f"{gid}: {len(sin)} sinonim (need {lo}-{hi if hi < 99 else 'n'})")
        if any(not str(s).strip() for s in sin):
            errors.append(f"{gid}: empty sinonim term")
        if len({str(s).lower() for s in sin}) != len(sin):
            errors.append(f"{gid}: duplicate sinonim terms")
        alias = g.get("alias", [])
        if any(a != a.lower() or not a.strip() for a in alias) or len(set(alias)) != len(alias):
            errors.append(f"{gid}: alias must be lowercased, non-empty and de-duplicated")
        if not alias:
            warns.append(f"{gid}: no alias (no meaningful words in its filenames)")
        insts = g.get("instances", [])
        if not insts:
            errors.append(f"{gid}: no instances")
        exp_brands = list(dict.fromkeys(it.get("brand") for it in insts))
        if g.get("brands") != exp_brands:
            errors.append(f"{gid}: brands {g.get('brands')} != instance brands {exp_brands}")
    if not dup_ids:
        ok.append(f"{len(ids)} unique snake_case ids")

    # 6. sorting
    keys = [(-len(g.get("brands", [])), g.get("id", "")) for g in glyphs]
    if keys != sorted(keys):
        errors.append("glyphs are not sorted by number of brands (desc), then id")
    else:
        ok.append("sorted by number of brands desc, then id")

    # 7. seed
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))["glyphs"]
    by_id = {g.get("id"): g for g in glyphs}
    if sorted(seed) != sorted(SEED16):
        errors.append("seed file ids differ from the expected 16")
    seed_ok = True
    extra_counts = {}
    for sid, sinst in seed.items():
        g = by_id.get(sid)
        if g is None:
            errors.append(f"seed glyph {sid} missing")
            seed_ok = False
            continue
        have = {(it["brand"], it["file"]) for it in g["instances"]}
        need = {(it["brand"], it["file"]) for it in sinst}
        lost = need - have
        if lost:
            errors.append(f"seed glyph {sid}: missing seed instances {sorted(lost)}")
            seed_ok = False
        extra_counts[sid] = len(have - need)
    if seed_ok:
        extra = {k: v for k, v in extra_counts.items() if v}
        ok.append(f"16 seed glyphs contain all {sum(len(v) for v in seed.values())} seed instances "
                  f"(extra instances: {extra})")

    # 8. deliverables
    kats = sorted({g.get("kategori") for g in glyphs})
    missing_sheets = [k for k in kats if not (REVIEW_DIR / f"{k}.png").exists()]
    if missing_sheets:
        errors.append(f"missing review sheets: {missing_sheets}")
    else:
        ok.append(f"review sheets present for {len(kats)} kategori")
    if not (CATALOG_DIR / "SUMMARY.md").exists():
        errors.append("catalog/SUMMARY.md missing")

    n_logo = len([g for g in glyphs if g.get("tipe") == "logo"])
    n_multi = len([g for g in glyphs if len(g.get("brands", [])) >= 2])
    n_single = len([g for g in glyphs if len(g.get("instances", [])) == 1])
    print(f"entries={len(glyphs)} glyph={len(glyphs) - n_logo} logo={n_logo} "
          f"multi_brand={n_multi} single_file={n_single}")
    for m in ok:
        print("  OK   ", m)
    for w in warns:
        print("  WARN ", w)
    for e in errors:
        print("  FAIL ", e)
    print("RESULT:", "PASS" if not errors else f"FAIL ({len(errors)} error(s))")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
