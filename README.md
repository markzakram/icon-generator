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

Buka http://localhost:5173. Layar yang tersedia:

| Menu | Untuk |
| --- | --- |
| Buat icon | Cari icon per bagian, preview, pasang lencana, unduh PNG/SVG, atau kumpulkan ke daftar unduhan (tombol +) |
| Unduh set | ZIP per brand: sumber (daftar unduhan, 16 standar, 24 v2, semua), versi, platform, ukuran dasar, SVG |
| Brand baru | Brand dari 3–4 warna hex, token v2 dihitung otomatis |
| Bandingkan | 1 glyph di semua brand: v1 vs v2, atau resmi vs generate |
| Uji 5 detik | Uji keterbacaan icon tanpa label, skor v1 vs v2, unduh CSV |
| Panduan v2 | Aturan, anatomi, token per brand (salin CSS), unduh semua SVG |

Tombol **Icon v2 / v1** di header memilih versi default; brand dipilih sekali di header dan berlaku di semua layar.

Pengalih **Icon brand | Logo app** di header membuka ruang kerja kedua, generator logo aplikasi internal (keluarga
Product: Freelance, Knowledge, Momentum, Track):

| Menu | Untuk |
| --- | --- |
| Buat logo | Nama app, piktogram (saran otomatis, 1.857 ikon Lucide, SVG sendiri, atau brief untuk Claude), pasangan warna; pratinjau semua varian dan unduh paket ZIP |
| Keluarga logo | Semua logo app, bandingkan dengan file asli, cek warna yang mirip, ekspor/impor JSON |
| Panduan logo | Aturan, anatomi, tabel warna, brief Claude |

Logo buatan sendiri tersimpan di browser (localStorage); pakai Ekspor JSON untuk membagikan atau memindahkannya.

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
| `reports/v2/` | Gambar set icon v2 untuk dokumentasi |
| `Logo app produk/` | Logo asli aplikasi internal (PNG, jangan diubah) |
| `pipeline/logo/` | Ekspor data generator logo: kerning font, pustaka Lucide, logo asli untuk pembanding |

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

## Icon v2

24 glyph inti digambar ulang sebagai SVG di `web/src/lib/v2/`. Aturan lengkapnya ada di tab "Panduan icon v2"
di PRD dan di menu Panduan v2.

| File | Isi |
| --- | --- |
| `glyphs.ts` | Master SVG (grid 96) per glyph; `id` sama dengan id di katalog |
| `tokens.ts` | 10 token warna (`P`, `PD`, `A`, `AD`, `L`, `LD`, `OP`, `OA`, `OL`, `AX`) yang diturunkan dari token brand |
| `badges.ts` | Lencana Gratis, Baru, Premium, Selesai, dan teks bebas (maks. 5 karakter) |
| `svg.ts` | Isi token ke SVG, versi kecil (<= 48 px), dan lencana |

Menambah icon v2:

1. Tambah entri di `V2_GLYPHS` dengan `id` glyph dari `catalog/glyphs.json`.
2. Gambar hanya dengan placeholder token (`{P}`, `{PD}`, ...), jangan hex langsung, supaya tampil benar di semua brand.
3. Sisi 3D digeser (-4, +4) dengan warna gelap dari mukanya; detail minimal 4 unit; isi di dalam kotak 10–86.
4. Detail yang boleh hilang di ukuran kecil dibungkus `<g class="fine">…</g>` (jangan ada `<g>` lain di dalamnya).
5. Cek di menu Panduan v2 (tombol 32 px) dan Bandingkan untuk beberapa brand, termasuk JadiPolisi (primer kuning)
   dan JadiPrajurit (aksen putih).

## Logo app

Kode di `web/src/lib/logo/`:

| File | Isi |
| --- | --- |
| `geometry.ts` | Kotak isometrik (proporsi diukur dari 4 logo asli), panel, pegangan, dan pemetaan piktogram 24×24 ke panel |
| `palette.ts` | 12 pasangan warna (4 pertama = warna app yang ada), warna gelap otomatis, varian latar gelap |
| `picto.ts` | 4 piktogram asli, pustaka Lucide, kata kunci Indonesia untuk saran, pembersih SVG tempelan, brief Claude |
| `text.ts` | Gabarito Black (OFL) diubah jadi outline dengan opentype.js |
| `compose.ts` | Logo, lockup dua/satu baris, teks saja, ikon aplikasi, favicon |
| `export.ts` | Paket ZIP: SVG 4 skema warna, PNG, iOS, Android (adaptive + monochrome), favicon .ico/.svg, PWA |

Data di `web/public/data/logo/` dibuat oleh `npm run export-logo-data` (butuh `fonttools` dan `pillow`). opentype.js tidak
bisa membaca kerning Gabarito (lookup GPOS extension), jadi pasangan kerningnya diratakan ke `kern.json` oleh skrip itu.

Menambah piktogram bawaan: tambah entri di `BUILTIN_PICTOS` (`picto.ts`), grid 24, `{B}` untuk warna terang dan `{D}`
untuk detail gelap, garis sekitar 2,4 unit dengan ujung bulat.
