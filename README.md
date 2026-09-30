# Icon Generator Multi-Brand

Generator icon untuk 14 brand (JadiASN, JadiPCPM, TOEFL Academy, dst.). Semua brand memakai ilustrasi yang sama
dengan palet berbeda, jadi icon yang belum ada bisa dibuat dengan mewarnai ulang glyph dari brand lain.

PRD: https://claude.ai/code/artifact/62365cc4-fafb-47a7-addb-ab323f65ffb7

## Menjalankan web app (preview lokal)

Butuh Node.js 20+. Dari folder utama proyek, sekali saja di awal:

```bash
npm install
```

Lalu setiap kali ingin melihat preview:

```bash
npm run dev
```

Buka http://localhost:5173. Layar yang tersedia: Generator, Bandingkan, Brand baru, dan Export.

Kalau icon sumber atau `catalog/brands.json` berubah, ekspor ulang data untuk web (butuh Python, lihat di bawah):

```bash
npm run export-data
```

Untuk deploy ke Vercel, set **Root Directory** ke `web`. Vercel akan mendeteksi Vite; build command `npm run build`, output `dist`.

## Struktur

| Folder | Isi |
| --- | --- |
| `Cerebrum/`, `JadiASN/`, ... | Icon sumber per brand (jangan diubah) |
| `catalog/` | `brands.json` (token warna per peran), `seed_standard16.json` (16 icon standar), `glyphs.json` (katalog semua glyph) |
| `pipeline/` | Script Python: segmentasi, prediksi warna, ekspor data web |
| `web/` | Web app (Vite + React + TypeScript); data icon di `web/public/data/` |
| `build/` | Hasil antara, boleh dihapus dan dibuat ulang |
| `reports/fase0/` | Laporan uji coba dan demo |

## Menjalankan Fase 0

Butuh Python 3.12 dengan `numpy`, `opencv-python`, dan `pillow`.

```bash
python pipeline/segment.py            # sejajarkan + pecah 16 glyph standar jadi wilayah warna
python pipeline/predict.py loo hybrid # uji leave-one-out 10 glyph x 3 brand
python pipeline/evaluate.py           # uji leave-one-out semua pasangan brand x glyph
python pipeline/demo.py               # icon yang belum ada: JadiPCPM Info/Tips/Link, set JadiBeasiswa
```

## Cara kerja singkat

1. `segment.py` menormalkan setiap icon (canvas persegi, padding 12%), menyejajarkan glyph yang sama antar
   brand, lalu memecahnya menjadi wilayah yang selalu diberi satu warna oleh setiap brand.
2. `catalog/brands.json` memberi peran pada tiap warna brand (primer, sisi 3D, aksen, terang, ...).
3. `predict.py` menebak peran tiap wilayah untuk brand yang belum punya glyph itu: suara dari brand yang
   gayanya mirip, digabung dengan kebiasaan brand itu sendiri di glyph lain. Warna tetap (kulit, rambut,
   punggung buku rapor) tidak diubah, dan output hanya memakai warna brand itu sendiri.
