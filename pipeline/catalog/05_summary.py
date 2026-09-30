"""Step 5: write catalog/SUMMARY.md (Indonesian) from catalog/glyphs.json,
glyph_meta.KEPUTUSAN and the diagnostics in build/catalog_review/glyph_stats.json."""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import BRAND_SHORT, BRANDS, BUILD_DIR, CATALOG_DIR, GLYPHS_PATH, read_json  # noqa: E402
from glyph_meta import KATEGORI, KEPUTUSAN  # noqa: E402

OUT = CATALOG_DIR / "SUMMARY.md"

# Hand-written explanations for the automatic cross-check (build step) disagreements.
PENJELASAN_SILANG = {
    "Cerebrum/Icon-PK.png": "ubin (x) dimiringkan sehingga siluetnya mirip `figural_analogi`; isi ubin "
                            "(x), (y), >= jelas `kuantitatif`.",
    "Cerebrum/Icon-Trisakti.png": "versi 3D, sedangkan Untitled-2 versi datar; skor bentuk rendah tetapi "
                                  "logonya sama.",
}


def md_escape(s: str) -> str:
    return s.replace("|", "\\|")


def code(s: str) -> str:
    return f"`{s}`"


def main():
    cat = read_json(GLYPHS_PATH)
    glyphs = cat["glyphs"]
    stats_p = BUILD_DIR / "glyph_stats.json"
    stats = read_json(stats_p) if stats_p.exists() else {}
    by_id = {g["id"]: g for g in glyphs}
    file_glyph = {it["file"]: g["id"] for g in glyphs for it in g["instances"]}

    n_files = len(file_glyph)
    n_entries = len(glyphs)
    logos = [g for g in glyphs if g["tipe"] == "logo"]
    plain = [g for g in glyphs if g["tipe"] == "glyph"]
    multi = [g for g in glyphs if len(g["brands"]) >= 2]
    one_brand = [g for g in glyphs if len(g["brands"]) == 1]
    single_file = [g for g in glyphs if len(g["instances"]) == 1]
    varian = [(g["id"], it) for g in glyphs for it in g["instances"] if it.get("varian")]
    dups = stats.get("duplikat", [])

    L: list[str] = []
    add = L.append
    add("# Katalog Glyph Ikon: Ringkasan Fase 0")
    add("")
    add(f"Dibuat {cat['dibuat']} dari `catalog/glyphs.json` (version {cat['version']}). "
        "Setiap file PNG di 14 folder brand dipetakan ke tepat satu entri. Sebuah *glyph* adalah satu gambar "
        "ilustrasi yang sama di semua brand (hanya palet warnanya yang beda). Sebuah *logo* adalah logo pihak "
        "ketiga (kampus, BUMN, sekolah kedinasan) yang **tidak boleh diwarnai ulang**.")
    add("")
    add("## Angka utama")
    add("")
    add("| Metrik | Jumlah |")
    add("|---|---:|")
    add(f"| Total file PNG sumber | {n_files} |")
    add(f"| Total entri katalog | {n_entries} |")
    add(f"| Glyph (tipe `glyph`, boleh diwarnai ulang) | {len(plain)} |")
    add(f"| Logo pihak ketiga (tipe `logo`) | {len(logos)} entri ({sum(len(g['instances']) for g in logos)} file) |")
    add(f"| Entri yang muncul di 2 brand atau lebih | {len(multi)} (semuanya glyph) |")
    add(f"| Entri yang hanya muncul di 1 brand | {len(one_brand)} ({len([g for g in one_brand if g['tipe'] == 'glyph'])} "
        f"glyph + {len([g for g in one_brand if g['tipe'] == 'logo'])} logo) |")
    add(f"| Singleton (entri dengan tepat 1 file) | {len(single_file)} "
        f"({len([g for g in single_file if g['tipe'] == 'glyph'])} glyph + "
        f"{len([g for g in single_file if g['tipe'] == 'logo'])} logo) |")
    add(f"| Instance bertanda `varian` (gambar sama, warna atau detail beda) | {len(varian)} |")
    if dups:
        add(f"| Duplikat persis (gambar dan warna identik, dalam brand yang sama) | {len(dups)} grup, "
            f"{sum(len(d['files']) for d in dups)} file |")
    add(f"| File belum terkelompok (`unassigned`) | {len(cat['unassigned'])} |")
    add("")

    add("## Per kategori")
    add("")
    add("| Kategori | Entri | File | Muncul di 2+ brand | Lembar review |")
    add("|---|---:|---:|---:|---|")
    for k in KATEGORI:
        gs = [g for g in glyphs if g["kategori"] == k]
        if not gs:
            continue
        add(f"| {k} | {len(gs)} | {sum(len(g['instances']) for g in gs)} | "
            f"{len([g for g in gs if len(g['brands']) >= 2])} | `catalog/review/{k}.png` |")
    add("")

    add("## Per brand")
    add("")
    add("| Brand | File | Entri berbeda | Logo |")
    add("|---|---:|---:|---:|")
    for b in BRANDS:
        files_b = [f for f in file_glyph if f.split("/", 1)[0] == b]
        ids_b = {file_glyph[f] for f in files_b}
        n_logo = len([i for i in ids_b if by_id[i]["tipe"] == "logo"])
        add(f"| {b} | {len(files_b)} | {len(ids_b)} | {n_logo} |")
    add("")

    add("## 30 glyph teratas berdasarkan jumlah brand")
    add("")
    add("| # | id | Nama | Kategori | Brand | File | Brand yang memakai |")
    add("|---:|---|---|---|---:|---:|---|")
    for n, g in enumerate(glyphs[:30], 1):
        add(f"| {n} | `{g['id']}` | {md_escape(g['nama'])} | {g['kategori']} | {len(g['brands'])} | "
            f"{len(g['instances'])} | {', '.join(BRAND_SHORT[b] for b in g['brands'])} |")
    add("")
    add("Singkatan brand: " + ", ".join(f"{BRAND_SHORT[b]} = {b}" for b in BRANDS) + ".")
    add("")

    add("## Pengelompokan yang perlu dicek (keputusan subjektif)")
    add("")
    add("Tingkat keyakinan: **tinggi** = hampir pasti benar, **sedang** = masuk akal tetapi bisa diperdebatkan.")
    add("")
    for n, kp in enumerate(KEPUTUSAN, 1):
        add(f"### {n}. {kp['judul']} (keyakinan: {kp['yakin']})")
        add("")
        add(kp["keputusan"])
        if kp["files"]:
            add("")
            for f in kp["files"]:
                add(f"- `{f}` → `{file_glyph[f]}`")
        add("")

    numbered = sorted((f for f in file_glyph if re.fullmatch(r"JadiPPG/\d+\.png", f)),
                      key=lambda f: int(re.search(r"(\d+)\.png$", f).group(1)))
    if numbered:
        add("### Pemetaan file JadiPPG bernomor")
        add("")
        add("| File | Glyph | Nama glyph |")
        add("|---|---|---|")
        for f in numbered:
            gid = file_glyph[f]
            add(f"| `{f}` | `{gid}` | {md_escape(by_id[gid]['nama'])} |")
        add("")

    add("## Instance bertanda `varian`")
    add("")
    add("Gambar yang sama dengan distribusi warna berbeda atau detail yang sedikit digambar ulang. "
        "Semuanya tetap satu glyph.")
    add("")
    add("| Glyph | File | Catatan |")
    add("|---|---|---|")
    for gid, it in varian:
        add(f"| `{gid}` | `{it['file']}` | {md_escape(it['varian'])} |")
    add("")

    if dups:
        add("## Duplikat persis dalam brand yang sama")
        add("")
        add("File-file ini identik (byte sama, atau piksel sama walau byte berbeda). Semuanya sudah tercatat "
            "sebagai instance glyph yang sama. Informasi ini berguna untuk membersihkan aset. Tidak ada file "
            "yang dihapus atau diubah.")
        add("")
        add("| Glyph | File | Identik |")
        add("|---|---|---|")
        for d in dups:
            add(f"| `{d['glyph']}` | " + "<br>".join(code(f) for f in d["files"]) +
                f" | {'byte' if d['identik_byte'] else 'piksel'} |")
        add("")

    if stats:
        add("## Validasi silang otomatis")
        add("")
        add("Kemiripan dihitung ulang untuk semua pasangan file (siluet + tepi antar-warna, tidak peduli warna). "
            "Instance yang lebih mirip ke glyph lain daripada ke glyph-nya sendiri:")
        add("")
        dis = stats.get("instance_disagreements", [])
        if dis:
            for d in dis:
                add(f"- `{d['file']}` (di `{d['glyph']}`, skor {d['sim_ke_glyph_sendiri']}) lebih mirip "
                    f"`{d['glyph_terdekat']}` ({d['sim_terdekat']}): "
                    f"{PENJELASAN_SILANG.get(d['file'], 'belum dijelaskan, perlu dicek')}")
        else:
            add("- Tidak ada.")
        add("")
        low = sorted(((v["min_sim"], k) for k, v in stats.get("glyph", {}).items() if "min_sim" in v))[:8]
        add("Glyph dengan kemiripan internal terendah (sudah dicek visual, tetap satu glyph): " +
            ", ".join(f"`{k}` ({v:.2f})" for v, k in low) + ".")
        add("")
        near, seen_pairs = [], set()
        for d in stats.get("singleton_nearest", []):
            pair = frozenset((d["glyph"], d["glyph_terdekat"]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                near.append(d)
        near = near[:10]
        if near:
            add("Singleton yang paling mirip glyph lain (sudah dicek visual, sengaja dipisah): " +
                "; ".join(f"`{d['glyph']}` ~ `{d['glyph_terdekat']}` ({d['sim_terdekat']:.2f})" for d in near) +
                ". Logo bulat saling mirip karena siluetnya lingkaran.")
            add("")

    add("## Metode singkat")
    add("")
    add("1. Setiap PNG dipotong ke kotak pembatas alfa, diberi padding menjadi persegi, lalu diperkecil. "
        "Tanda tangan yang tidak peduli warna dibuat dari (a) siluet alfa, (b) tepi antar-wilayah warna "
        "(Sobel pada gambar berwarna, di-threshold dan didilasi) dan (c) garis tepi siluet.")
    add("2. Kemiripan pasangan = 0,35 x IoU siluet + 0,45 x kosinus tepi internal + 0,20 x kosinus garis tepi, "
        "masing-masing diambil maksimum dari pergeseran kecil. Ambang 0,70 dikalibrasi dengan seed 16 glyph "
        "(tidak ada klaster yang mencampur dua glyph seed).")
    add("3. Klaster average-linkage lalu **diverifikasi visual** lewat contact sheet (`build/catalog_review/`). "
        "Pemisahan dan penggabungan manual dicatat di `pipeline/catalog/assignments.json`. Nama, kategori dan "
        "sinonim ada di `pipeline/catalog/glyph_meta.py`.")
    add("4. `pipeline/catalog/validate.py` memeriksa: 510 file muncul tepat sekali, semua path ada, id unik dan "
        "snake_case, jumlah sinonim (8-15 untuk glyph, minimal 3 untuk logo), dan kecocokan dengan "
        "`catalog/seed_standard16.json`.")
    add("")
    add("## Cara menjalankan ulang")
    add("")
    add("```")
    add("python pipeline/catalog/01_features.py      # tanda tangan + thumbnail (sekitar 1 menit)")
    add("python pipeline/catalog/02_cluster.py       # kemiripan, klaster otomatis, contact sheet kandidat")
    add("python pipeline/catalog/03_build_catalog.py # assignments.json + glyph_meta.py -> catalog/glyphs.json")
    add("python pipeline/catalog/04_review_sheets.py # catalog/review/<kategori>.png (--all: semua instance)")
    add("python pipeline/catalog/05_summary.py       # catalog/SUMMARY.md")
    add("python pipeline/catalog/validate.py         # pemeriksaan akhir")
    add("```")
    add("")
    OUT.write_text("\n".join(L), encoding="utf-8", newline="\n")
    print(f"wrote {OUT} ({len(L)} lines)")


if __name__ == "__main__":
    main()
