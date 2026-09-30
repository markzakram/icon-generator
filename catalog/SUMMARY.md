# Katalog Glyph Ikon: Ringkasan Fase 0

Dibuat 2026-09-30 dari `catalog/glyphs.json` (version 1). Setiap file PNG di 14 folder brand dipetakan ke tepat satu entri. Sebuah *glyph* adalah satu gambar ilustrasi yang sama di semua brand (hanya palet warnanya yang beda). Sebuah *logo* adalah logo pihak ketiga (kampus, BUMN, sekolah kedinasan) yang **tidak boleh diwarnai ulang**.

## Angka utama

| Metrik | Jumlah |
|---|---:|
| Total file PNG sumber | 510 |
| Total entri katalog | 146 |
| Glyph (tipe `glyph`, boleh diwarnai ulang) | 104 |
| Logo pihak ketiga (tipe `logo`) | 42 entri (44 file) |
| Entri yang muncul di 2 brand atau lebih | 66 (semuanya glyph) |
| Entri yang hanya muncul di 1 brand | 80 (38 glyph + 42 logo) |
| Singleton (entri dengan tepat 1 file) | 77 (37 glyph + 40 logo) |
| Instance bertanda `varian` (gambar sama, warna atau detail beda) | 18 |
| Duplikat persis (gambar dan warna identik, dalam brand yang sama) | 23 grup, 47 file |
| File belum terkelompok (`unassigned`) | 0 |

## Per kategori

| Kategori | Entri | File | Muncul di 2+ brand | Lembar review |
|---|---:|---:|---:|---|
| menu | 24 | 184 | 19 | `catalog/review/menu.png` |
| subtes | 35 | 139 | 23 | `catalog/review/subtes.png` |
| mapel | 14 | 63 | 10 | `catalog/review/mapel.png` |
| profesi_bidang | 23 | 51 | 8 | `catalog/review/profesi_bidang.png` |
| lembaga | 2 | 7 | 1 | `catalog/review/lembaga.png` |
| orang | 5 | 19 | 4 | `catalog/review/orang.png` |
| logo | 42 | 44 | 0 | `catalog/review/logo.png` |
| lainnya | 1 | 3 | 1 | `catalog/review/lainnya.png` |

## Per brand

| Brand | File | Entri berbeda | Logo |
|---|---:|---:|---:|
| Cerebrum | 73 | 62 | 26 |
| JadiASN | 28 | 28 | 0 |
| JadiBUMN | 65 | 62 | 11 |
| JadiBeasiswa | 1 | 1 | 0 |
| JadiOJK | 41 | 40 | 0 |
| JadiPCPM | 32 | 31 | 0 |
| JadiPPG | 79 | 66 | 0 |
| JadiPPPK | 47 | 46 | 0 |
| JadiPolisi | 5 | 5 | 0 |
| JadiPrajurit | 42 | 41 | 0 |
| JadiSekdin | 55 | 52 | 5 |
| Jago TPA | 20 | 20 | 0 |
| Psikotes kerja | 1 | 1 | 0 |
| TOEFL Academy | 21 | 21 | 0 |

## 30 glyph teratas berdasarkan jumlah brand

| # | id | Nama | Kategori | Brand | File | Brand yang memakai |
|---:|---|---|---|---:|---:|---|
| 1 | `rapor` | Rapor / Hasil Belajar | menu | 14 | 17 | CER, ASN, BUMN, BEA, OJK, PCPM, PPG, PPPK, POL, PRA, SEK, TPA, PSI, TOEFL |
| 2 | `tryout` | Tryout | menu | 12 | 12 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, POL, PRA, SEK, TPA, TOEFL |
| 3 | `kalender` | Kalender / Jadwal | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 4 | `kertas_soal` | Kertas Soal / Lembar Ujian | menu | 11 | 12 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 5 | `lapor_masalah` | Lapor Masalah | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 6 | `latsol` | Latihan Soal (Latsol) | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 7 | `live_class` | Live Class / Kelas Langsung | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 8 | `materi` | Materi / Course | menu | 11 | 13 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 9 | `monitor` | Monitor / Belajar Online | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 10 | `numerik` | Numerik / Deret Angka | subtes | 11 | 13 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, POL, PRA, SEK, TPA |
| 11 | `pdf` | PDF / Dokumen | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 12 | `promo` | Promo / Diskon | menu | 11 | 11 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK, TPA, TOEFL |
| 13 | `grup` | Grup / Komunitas | menu | 9 | 11 | CER, ASN, BUMN, OJK, PPG, PPPK, PRA, SEK, TPA |
| 14 | `journey` | Journey / Dibimbing | menu | 9 | 9 | CER, ASN, BUMN, OJK, PCPM, PPG, PPPK, PRA, SEK |
| 15 | `bulu` | Dua Bulu / Sosial Budaya | subtes | 8 | 9 | ASN, OJK, PCPM, PPG, PPPK, PRA, SEK, TOEFL |
| 16 | `figural_serial` | Figural Serial / Pola Gambar | subtes | 8 | 8 | BUMN, OJK, PCPM, PPPK, POL, PRA, SEK, TPA |
| 17 | `tips` | Tips / Diskusi | menu | 8 | 8 | CER, ASN, BUMN, OJK, PPG, PPPK, PRA, TPA |
| 18 | `kalkulator` | Kalkulator / Numerik Berhitung | subtes | 7 | 7 | CER, ASN, BUMN, OJK, PPPK, PRA, SEK |
| 19 | `kuantitatif` | Kuantitatif / Perbandingan Kuantitatif | subtes | 7 | 7 | CER, ASN, BUMN, PPG, PPPK, SEK, TPA |
| 20 | `soal_cerita` | Soal Cerita / Verbal (ubin abc) | subtes | 7 | 7 | BUMN, OJK, PPG, PPPK, POL, SEK, TOEFL |
| 21 | `tas_medis` | Tas Medis / Kesehatan | profesi_bidang | 7 | 7 | CER, BUMN, OJK, PCPM, PPG, PPPK, PRA |
| 22 | `tengkorak_lup` | Tengkorak & Lup / Psikologi | subtes | 7 | 7 | CER, OJK, PCPM, PPG, PPPK, PRA, SEK |
| 23 | `toga` | Wisudawati / Toga | orang | 7 | 7 | CER, BUMN, PPG, PPPK, PRA, SEK, TPA |
| 24 | `topeng_drama` | Topeng Drama / TKP | subtes | 7 | 7 | ASN, BUMN, OJK, PCPM, PPPK, PRA, SEK |
| 25 | `bahasa_inggris` | Bahasa Inggris (balon EN) | mapel | 6 | 7 | CER, BUMN, OJK, PCPM, SEK, TOEFL |
| 26 | `buku_psi` | Buku Psikologi (Ψ) / Psikotes | subtes | 6 | 6 | BUMN, OJK, PCPM, PPG, PRA, SEK |
| 27 | `garuda` | Garuda / TWK | subtes | 6 | 7 | CER, ASN, PPG, PPPK, PRA, SEK |
| 28 | `gedung_pilar` | Gedung Pilar / Lembaga Negara | lembaga | 6 | 6 | ASN, BUMN, PCPM, PPG, PPPK, SEK |
| 29 | `globe` | Globe / Geografi & Pengetahuan Umum | mapel | 6 | 10 | CER, BUMN, OJK, PPG, PRA, SEK |
| 30 | `headset_cs` | Headset CS / Pelayanan | orang | 6 | 6 | ASN, OJK, PPG, PPPK, SEK, TOEFL |

Singkatan brand: CER = Cerebrum, ASN = JadiASN, BUMN = JadiBUMN, BEA = JadiBeasiswa, OJK = JadiOJK, PCPM = JadiPCPM, PPG = JadiPPG, PPPK = JadiPPPK, POL = JadiPolisi, PRA = JadiPrajurit, SEK = JadiSekdin, TPA = Jago TPA, PSI = Psikotes kerja, TOEFL = TOEFL Academy.

## Pengelompokan yang perlu dicek (keputusan subjektif)

Tingkat keyakinan: **tinggi** = hampir pasti benar, **sedang** = masuk akal tetapi bisa diperdebatkan.

### 1. Kimia Farma bukan logo resmi (keyakinan: sedang)

Digambar sebagai dua tablet obat dengan palet JadiBUMN, jadi dicatat sebagai glyph `obat_tablet` (boleh diwarnai ulang), bukan `logo_kimia_farma`. Ubah ke tipe logo bila tim menganggapnya representasi resmi perusahaan.

- `JadiBUMN/kimia farma-icon.png` → `obat_tablet`

### 2. Ikon PLN ada dua jenis (keyakinan: tinggi)

PLN-Icon2 = logo resmi PLN (`logo_pln`). PLN-Icon = rambu segitiga petir, gambar yang sama dengan glyph PPG teknik elektronika, jadi masuk `tanda_listrik` (glyph, boleh diwarnai ulang).

- `JadiBUMN/PLN-Icon.png` → `tanda_listrik`
- `JadiBUMN/PLN-Icon2.png` → `logo_pln`
- `JadiPPG/Icon_Studi teknik elektronika.png` → `tanda_listrik`

### 3. Nama file logo tidak cocok dengan gambarnya (keyakinan: sedang)

Icon-USM berisi logo UNS (Universitas Sebelas Maret), jadi `logo_uns`. Icon-USU berisi lambang Kota Surabaya (Tugu Pahlawan, ikan sura dan buaya), bukan logo USU, jadi `logo_surabaya`. Perlu dicek ke tim konten apakah file salah unggah.

- `Cerebrum/Icon-USM.png` → `logo_uns`
- `Cerebrum/Icon-USU.png` → `logo_surabaya`

### 4. Satu logo, dua file (keyakinan: tinggi)

Untitled-2 = logo Trisakti versi datar tanpa bayangan 3D, digabung ke `logo_trisakti` sebagai varian. Mind-icon dan mind-id-logo-... adalah gambar yang sama, digabung ke `logo_mind_id`.

- `Cerebrum/Icon-Trisakti.png` → `logo_trisakti`
- `Cerebrum/Untitled-2.png` → `logo_trisakti`
- `JadiBUMN/Mind-icon.png` → `logo_mind_id`
- `JadiBUMN/mind-id-logo-e1650472609768.png` → `logo_mind_id`

### 5. Isi berbeda di bingkai yang sama dipisah jadi glyph sendiri (keyakinan: sedang)

Mengikuti aturan ubin 2x2: bila simbol atau teks di dalamnya membawa makna, glyph dipisah. Puzzle polos (`puzzle`) dipisah dari puzzle bersimbol petir dan steker (`puzzle_listrik`) serta minus dan kali (`puzzle_matematika`). Panel `abstraksi_ruang` dipisah dari versi bertulisan D3-S2 (`rbb_d3_s2`) dan SMA (`rbb_sma`). Perisai berkubus (`perisai`) dipisah dari perisai bergembok (`perisai_gembok`). Bisa digabung sebagai varian jika tim lebih suka.

- `JadiBUMN/TKP PLN-Icon.png` → `puzzle_listrik`
- `JadiOJK/icon_Kemampuan umum numerik.png` → `puzzle_matematika`
- `JadiSekdin/icon_Materi matematika.png` → `puzzle_matematika`
- `JadiBUMN/RBB-Icon.png` → `rbb_d3_s2`
- `JadiBUMN/RBB-SMA-Icon.png` → `rbb_sma`
- `JadiPPPK/icon_Keamanan dan keselamatan.png` → `perisai_gembok`

### 6. Balon percakapan: empat glyph berbeda (keyakinan: tinggi)

Dua balon berisi titik = `tips` (seed). Dua balon bertuliskan EN = `bahasa_inggris`, bertuliskan INA = `bahasa_indonesia`. Satu balon besar dengan gelombang sinyal = `verbal`.

- `Cerebrum/Icon-Tips.png` → `tips`
- `Cerebrum/Icon-Eng.png` → `bahasa_inggris`
- `Cerebrum/Icon-Ina.png` → `bahasa_indonesia`
- `JadiBUMN/Verbal.png` → `verbal`

### 7. Penamaan `verbal` vs `soal_cerita` (keyakinan: sedang)

Ubin 'abc 5 cba ...' paling sering bernama 'Soal cerita' (3 brand), jadi id-nya `soal_cerita`. Id `verbal` dipakai untuk balon bicara bergelombang, yang di keempat brand bernama 'Verbal'.

- `JadiPPPK/icon_Soal cerita.png` → `soal_cerita`
- `JadiSekdin/icon_ Soal cerita.png` → `soal_cerita`
- `JadiOJK/icon_Numerik soal cerita.png` → `soal_cerita`
- `JadiBUMN/Verbal.png` → `verbal`
- `JadiPPPK/icon_Verbal.png` → `verbal`
- `JadiSekdin/icon_Verbal.png` → `verbal`
- `JadiOJK/icon_Kemampuan umum verbal.png` → `verbal`

### 8. Toga wanita dan pria dipisah (keyakinan: tinggi)

Dua gambar berbeda (rambut panjang vs pendek): `toga` (7 brand) dan `toga_pria` (2 brand).

- `JadiPPG/Icon_Studi pendidikan luar biasa.png` → `toga_pria`
- `JadiPPPK/Icon_Tryout PPPK Sekolah Rakyat 2026.png` → `toga_pria`

### 9. Lencana TOEFL tiga tingkat dipisah (keyakinan: tinggi)

Starter, Booster dan Ace digambar dengan jumlah chevron berbeda (1/2/3), jadi tiga glyph `lencana_tingkat_1..3`, bukan varian warna.

- `TOEFL Academy/icon_Starter test.png` → `lencana_tingkat_1`
- `TOEFL Academy/icon_Booster test.png` → `lencana_tingkat_2`
- `TOEFL Academy/icon_Ace test.png` → `lencana_tingkat_3`

### 10. Gambar yang digambar ulang tetap dianggap glyph yang sama (varian) (keyakinan: sedang)

Mengikuti seed (journey Cerebrum/BUMN dan tips ASN/Prajurit juga digambar sedikit berbeda): palu hakim JadiBUMN yang digambar ulang tetap `palu_hakim`; kuantitatif Cerebrum dengan ubin (x) miring tetap `kuantitatif`; ubin abc JadiBUMN dengan dua titik tetap `soal_cerita`; tanda silang JadiPrajurit yang lebih lebar tetap `tutup`. Masing-masing diberi catatan `varian`.

- `JadiBUMN/Hukum-Icon.png` → `palu_hakim`
- `Cerebrum/Icon-PK.png` → `kuantitatif`
- `JadiBUMN/Logic Reasoning-Icon.png` → `soal_cerita`
- `JadiPrajurit/Menu-Close.png` → `tutup`
- `Cerebrum/Icon-Journey.png` → `journey`
- `JadiBUMN/Journey-Icon.png` → `journey`
- `JadiASN/Menu-Tips.png` → `tips`
- `JadiPrajurit/Menu-Tips.png` → `tips`

### 11. Nama file menyesatkan (gambar lebih dipercaya daripada nama) (keyakinan: tinggi)

JadiPolisi/icon_Latsol.png bergambar Tryout (sesuai seed). Di JadiPPPK, 'icon_Tryout PPPK.png' (tanpa spasi) = `puzzle`, sedangkan 'icon_Tryout PPPK .png' (dengan spasi) = `kertas_soal`. Di JadiPPG nama tertukar: 'Icon_Studi bahasa indonesia' bergambar bendera Inggris (`bendera_inggris`) dan 'Icon_Studi bahasa inggris' bergambar bendera Indonesia (`bendera_indonesia`).

- `JadiPolisi/icon_Latsol.png` → `tryout`
- `JadiPPPK/icon_Tryout PPPK.png` → `puzzle`
- `JadiPPPK/icon_Tryout PPPK .png` → `kertas_soal`
- `JadiPPG/Icon_Studi bahasa indonesia.png` → `bendera_inggris`
- `JadiPPG/Icon_Studi bahasa inggris.png` → `bendera_indonesia`

### 12. File tanpa nama bermakna, dikelompokkan murni dari gambar (keyakinan: tinggi)

JadiPPG/1.png sampai 14.png (lihat tabel pemetaan di bawah), JadiSekdin/icon.png (`palu_hakim`), JadiSekdin/icon_.png (`globe`), JadiPrajurit/Artboard 14@4x.png (`layar_video`, satu-satunya glyph tanpa alias) dan Cerebrum/Untitled-2.png (`logo_trisakti`).

- `JadiSekdin/icon.png` → `palu_hakim`
- `JadiSekdin/icon_.png` → `globe`
- `JadiPrajurit/Artboard 14@4x.png` → `layar_video`
- `Cerebrum/Untitled-2.png` → `logo_trisakti`

### 13. Instance tambahan untuk glyph seed (keyakinan: tinggi)

Ditemukan gambar yang sama di luar seed: rapor (+3), grup (+2), kertas_soal (+1), materi (+2 versi warna Cerebrum). Semua instance seed tetap di glyph seed-nya.

- `JadiOJK/icon_Latihan soal.png` → `rapor`
- `JadiPCPM/icon_Latsol harian Assesment.png` → `rapor`
- `JadiPrajurit/icon_blanko .png` → `rapor`
- `JadiBUMN/Icon - Manajemen Bidang.png` → `grup`
- `JadiSekdin/TKP - Jejaring kerja.png` → `grup`
- `Cerebrum/Icon-Reading.png` → `kertas_soal`
- `Cerebrum/Icon-Materi-Biru.png` → `materi`
- `Cerebrum/Icon-Materi-Kuning.png` → `materi`

### 14. Label TIU/TKP/TWK 2024-2026 di JadiASN memakai glyph berbeda tiap tahun (keyakinan: tinggi)

Bukan kesalahan pengelompokan, hanya catatan: TIU 2024/2025/2026 = `kuantitatif`/`kalkulator`/`numerik`; TKP 2024/2025/2026 = `bulu`/`topeng_drama`/`headset_cs`; TWK 2024/2025/2026 = `abstraksi_ruang`/`gedung_pilar`/`garuda`.

- `JadiASN/Icon_TIU 2024.png` → `kuantitatif`
- `JadiASN/Icon_TIU 2025.png` → `kalkulator`
- `JadiASN/Icon_TIU 2026.png` → `numerik`
- `JadiASN/Icon_TKP 2024.png` → `bulu`
- `JadiASN/Icon_TKP 2025.png` → `topeng_drama`
- `JadiASN/Icon_TKP 2026.png` → `headset_cs`
- `JadiASN/Icon_TWK 2024.png` → `abstraksi_ruang`
- `JadiASN/Icon_TWK 2025.png` → `gedung_pilar`
- `JadiASN/Icon_TWK 2026.png` → `garuda`

### 15. Kategori ambigu (makna berbeda antar brand) (keyakinan: sedang)

Kategori dipilih dari makna dominan: `globe` (geografi/pengetahuan umum/TIU) masuk mapel; `uang` (ekonomi/keuangan) masuk mapel; `roda_gigi` (teknik-op/checking test/psikometri/SSN) masuk profesi_bidang; `bulu` (TKP/sosial budaya/seni rupa/TOEFL) masuk subtes; `kristal` (tryout tahap 1/STMKG) masuk lainnya; `monitor` (test/pengenalan/progres belajar) masuk menu; `bendera_indonesia` (bahasa negara/TWK) masuk subtes; `rbb_d3_s2`/`rbb_sma`/`puzzle`/`perisai` (jalur dan tahap seleksi) masuk subtes. Ilustrasi manusia bermakna umum (toga, CS, guru, kerumunan) masuk orang, sedangkan yang mewakili jurusan atau mapel tertentu (koki, tukang las, guru SD/PAUD, guru olahraga) mengikuti makna jurusan/mapelnya.

### Pemetaan file JadiPPG bernomor

| File | Glyph | Nama glyph |
|---|---|---|
| `JadiPPG/1.png` | `buku_psi` | Buku Psikologi (Ψ) / Psikotes |
| `JadiPPG/2.png` | `perisai` | Perisai / SKB & Bela Negara |
| `JadiPPG/3.png` | `toga` | Wisudawati / Toga |
| `JadiPPG/4.png` | `tas_medis` | Tas Medis / Kesehatan |
| `JadiPPG/5.png` | `gedung_pilar` | Gedung Pilar / Lembaga Negara |
| `JadiPPG/6.png` | `satelit` | Parabola / Teknologi & Komunikasi |
| `JadiPPG/7.png` | `link` | Link / Tautan |
| `JadiPPG/8.png` | `palu_hakim` | Palu Hakim / Hukum |
| `JadiPPG/9.png` | `info` | Info / Pengumuman |
| `JadiPPG/10.png` | `buku_video` | E-book / Buku Video |
| `JadiPPG/11.png` | `tips` | Tips / Diskusi |
| `JadiPPG/12.png` | `figural_ketidaksamaan` | Figural Ketidaksamaan |
| `JadiPPG/13.png` | `kristal` | Kristal |
| `JadiPPG/14.png` | `bulan_bintang` | Bulan Bintang / Keagamaan |

## Instance bertanda `varian`

Gambar yang sama dengan distribusi warna berbeda atau detail yang sedikit digambar ulang. Semuanya tetap satu glyph.

| Glyph | File | Catatan |
|---|---|---|
| `materi` | `Cerebrum/Icon-Materi-Biru.png` | warna alternatif dalam brand yang sama: aksen biru muda |
| `materi` | `Cerebrum/Icon-Materi-Kuning.png` | warna alternatif dalam brand yang sama: aksen kuning |
| `numerik` | `JadiPPG/Icon_Saintek_Matematika revisi.png` | versi revisi: distribusi warna berbeda (aksen oranye) |
| `journey` | `Cerebrum/Icon-Journey.png` | variasi gambar: alas peta dan pin sedikit berbeda (sama dengan JadiBUMN) |
| `journey` | `JadiBUMN/Journey-Icon.png` | variasi gambar: alas peta dan pin sedikit berbeda (sama dengan Cerebrum) |
| `tips` | `JadiASN/Menu-Tips.png` | variasi gambar: susunan dua balon sedikit berbeda (sama dengan JadiPrajurit) |
| `tips` | `JadiPrajurit/Menu-Tips.png` | variasi gambar: susunan dua balon sedikit berbeda (sama dengan JadiASN) |
| `kuantitatif` | `Cerebrum/Icon-PK.png` | variasi gambar: ubin (x) dimiringkan |
| `soal_cerita` | `JadiBUMN/Logic Reasoning-Icon.png` | variasi gambar: ubin keempat berisi dua titik (bukan tiga) |
| `globe` | `JadiPPG/Icon_Soshum_Geografi revisi.png` | versi revisi: distribusi warna berbeda (aksen oranye) |
| `palu_hakim` | `JadiBUMN/Hukum-Icon.png` | variasi gambar: palu dan alas digambar ulang dengan sudut berbeda |
| `uang` | `JadiPPG/Icon_Soshum_Ekonomi revisi .png` | versi revisi: distribusi warna berbeda (aksen oranye) |
| `dna` | `JadiPPG/Icon_Saintek_Biologi revisi.png` | versi revisi: distribusi warna berbeda (aksen oranye) |
| `toga_pria` | `JadiPPPK/Icon_Tryout PPPK Sekolah Rakyat 2026.png` | variasi warna: kulit lebih terang |
| `tutup` | `JadiPrajurit/Menu-Close.png` | variasi gambar: proporsi lebih lebar, perspektif berbeda |
| `guru` | `JadiPPG/Icon_Dalam jabatan.png` | variasi warna dalam brand yang sama: dasi merah muda |
| `guru` | `JadiPPG/Icon_Prajabatan.png` | variasi warna dalam brand yang sama: dasi biru |
| `logo_trisakti` | `Cerebrum/Untitled-2.png` | variasi gambar: logo yang sama versi datar tanpa bayangan 3D |

## Duplikat persis dalam brand yang sama

File-file ini identik (byte sama, atau piksel sama walau byte berbeda). Semuanya sudah tercatat sebagai instance glyph yang sama. Informasi ini berguna untuk membersihkan aset. Tidak ada file yang dihapus atau diubah.

| Glyph | File | Identik |
|---|---|---|
| `rapor` | `JadiPrajurit/icon_blanko .png`<br>`JadiPrajurit/icon_rapor.png` | piksel |
| `kertas_soal` | `Cerebrum/Icon-Reading.png`<br>`Cerebrum/Icon-TO.png` | byte |
| `numerik` | `Cerebrum/Icon-Math.png`<br>`Cerebrum/Saintek/Saintek_matematika.png` | byte |
| `grup` | `JadiBUMN/Group-Icon.png`<br>`JadiBUMN/Icon - Manajemen Bidang.png` | byte |
| `grup` | `JadiSekdin/TKP - Jejaring kerja.png`<br>`JadiSekdin/icon_Grup & PDF.png` | byte |
| `bulu` | `JadiPPPK/icon_Latsol PPPK.png`<br>`JadiPPPK/icon_Sosial budaya .png` | byte |
| `bahasa_inggris` | `JadiSekdin/Icon_TBI - Structure.png`<br>`JadiSekdin/icon_Inggris.png` | byte |
| `garuda` | `JadiSekdin/TWK - Nasionalisme.png`<br>`JadiSekdin/icon_Kebangsaan.png` | byte |
| `globe` | `Cerebrum/Icon-PU.png`<br>`Cerebrum/Soshum/Soshum_Geografi.png` | byte |
| `globe` | `JadiPPG/Icon_Soshum_Geografi.png`<br>`JadiPPG/Icon_Studi IPA.png`<br>`JadiPPG/Icon_Studi geografi.png` | byte |
| `kubus_bertumpuk` | `JadiBUMN/Agility-Icon.png`<br>`JadiBUMN/Icon - Menentukan Bentuk.png` | byte |
| `uang` | `Cerebrum/Icon-Ekonomi.png`<br>`Cerebrum/Soshum/Soshum_Ekonomi.png` | byte |
| `uang` | `JadiPPG/Icon_Soshum_Ekonomi.png`<br>`JadiPPG/Icon_Studi ekonomi.png` | byte |
| `keluarga` | `Cerebrum/Icon-Sosiology.png`<br>`Cerebrum/Soshum/Soshum_Sosiologi.png` | byte |
| `keluarga` | `JadiPPG/Icon_Soshum_Sosiologi.png`<br>`JadiPPG/Icon_Studi sosiologi.png` | byte |
| `atom` | `Cerebrum/Icon-Fisika.png`<br>`Cerebrum/Saintek/Saintek_Fisika.png` | byte |
| `atom` | `JadiPPG/Icon_Saintek_Fisika.png`<br>`JadiPPG/Icon_Studi Fisika.png` | byte |
| `dna` | `Cerebrum/Icon-Biologi.png`<br>`Cerebrum/Saintek/Saintek_Biologi.png` | byte |
| `dna` | `JadiPPG/Icon_Saintek_Biologi.png`<br>`JadiPPG/Icon_Studi Biologi.png` | byte |
| `mikroskop` | `Cerebrum/Icon-Skolastik.png`<br>`Cerebrum/Saintek/Saintek_Kimia.png` | byte |
| `mikroskop` | `JadiPPG/Icon_Saintek_Kimia.png`<br>`JadiPPG/Icon_Studi Kimia.png` | byte |
| `museum` | `JadiPPG/Icon_Soshum_Sejarah.png`<br>`JadiPPG/Icon_Studi sejarah.png` | byte |
| `logo_mind_id` | `JadiBUMN/Mind-icon.png`<br>`JadiBUMN/mind-id-logo-e1650472609768.png` | piksel |

## Validasi silang otomatis

Kemiripan dihitung ulang untuk semua pasangan file (siluet + tepi antar-warna, tidak peduli warna). Instance yang lebih mirip ke glyph lain daripada ke glyph-nya sendiri:

- `Cerebrum/Icon-PK.png` (di `kuantitatif`, skor 0.79) lebih mirip `figural_analogi` (0.842): ubin (x) dimiringkan sehingga siluetnya mirip `figural_analogi`; isi ubin (x), (y), >= jelas `kuantitatif`.
- `Cerebrum/Icon-Trisakti.png` (di `logo_trisakti`, skor 0.44) lebih mirip `tanda_listrik` (0.472): versi 3D, sedangkan Untitled-2 versi datar; skor bentuk rendah tetapi logonya sama.

Glyph dengan kemiripan internal terendah (sudah dicek visual, tetap satu glyph): `logo_trisakti` (0.44), `tutup` (0.53), `palu_hakim` (0.53), `journey` (0.57), `tips` (0.63), `koper` (0.67), `link` (0.72), `kuantitatif` (0.78).

Singleton yang paling mirip glyph lain (sudah dicek visual, sengaja dipisah): `rbb_d3_s2` ~ `rbb_sma` (0.93); `logo_ipdn` ~ `logo_pkn_stan` (0.93); `logo_udayana` ~ `logo_umy` (0.93); `logo_uny` ~ `logo_umy` (0.91); `logo_petra` ~ `logo_ipdn` (0.90); `logo_stin` ~ `logo_pkn_stan` (0.90); `logo_unair` ~ `logo_ipdn` (0.89); `logo_unj` ~ `logo_umy` (0.88); `logo_gunadarma` ~ `logo_unpad` (0.88); `logo_stis` ~ `logo_petra` (0.87). Logo bulat saling mirip karena siluetnya lingkaran.

## Metode singkat

1. Setiap PNG dipotong ke kotak pembatas alfa, diberi padding menjadi persegi, lalu diperkecil. Tanda tangan yang tidak peduli warna dibuat dari (a) siluet alfa, (b) tepi antar-wilayah warna (Sobel pada gambar berwarna, di-threshold dan didilasi) dan (c) garis tepi siluet.
2. Kemiripan pasangan = 0,35 x IoU siluet + 0,45 x kosinus tepi internal + 0,20 x kosinus garis tepi, masing-masing diambil maksimum dari pergeseran kecil. Ambang 0,70 dikalibrasi dengan seed 16 glyph (tidak ada klaster yang mencampur dua glyph seed).
3. Klaster average-linkage lalu **diverifikasi visual** lewat contact sheet (`build/catalog_review/`). Pemisahan dan penggabungan manual dicatat di `pipeline/catalog/assignments.json`. Nama, kategori dan sinonim ada di `pipeline/catalog/glyph_meta.py`.
4. `pipeline/catalog/validate.py` memeriksa: 510 file muncul tepat sekali, semua path ada, id unik dan snake_case, jumlah sinonim (8-15 untuk glyph, minimal 3 untuk logo), dan kecocokan dengan `catalog/seed_standard16.json`.

## Cara menjalankan ulang

```
python pipeline/catalog/01_features.py      # tanda tangan + thumbnail (sekitar 1 menit)
python pipeline/catalog/02_cluster.py       # kemiripan, klaster otomatis, contact sheet kandidat
python pipeline/catalog/03_build_catalog.py # assignments.json + glyph_meta.py -> catalog/glyphs.json
python pipeline/catalog/04_review_sheets.py # catalog/review/<kategori>.png (--all: semua instance)
python pipeline/catalog/05_summary.py       # catalog/SUMMARY.md
python pipeline/catalog/validate.py         # pemeriksaan akhir
```
