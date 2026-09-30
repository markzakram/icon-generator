import { useState } from "react";
import { SvgImg } from "../components/SvgImg";
import { contrast } from "../lib/color";
import { copyText } from "../lib/download";
import { LOCKUP, markBody, type Kit } from "../lib/logo/compose";
import { BOX, markGeometry, matrixAttr } from "../lib/logo/geometry";
import { useLogoKit } from "../lib/logo/kit";
import { brightOnDark } from "../lib/logo/palette";
import { claudeBrief } from "../lib/logo/picto";
import { BUILTIN_LOGOS, useFamily } from "../lib/logo/store";

const RULES: [string, string][] = [
  ["Satu kotak untuk semua app", "Geometri kotak sama persis di setiap app: sisi miring ±28°, celah antarmuka, dan sudut membulat. Yang berubah hanya piktogram dan warna."],
  ["Dua warna per app", "Warna gelap untuk kotak dan kata “Product”, warna terang untuk panel, piktogram, dan nama app. Detail piktogram boleh memakai warna gelap."],
  ["Warna harus mudah dibedakan", "Warna terang app baru minimal 22° berbeda dari app lain. Generator mengurutkan pilihan warna dari yang paling berbeda."],
  ["Piktogram bergaris", "Grid 24 unit, garis 2,4 unit dengan ujung bulat, maksimal ±8 bentuk, tanpa teks. Piktogram ditempel mengikuti bidang panel."],
  ["Tipografi tetap", "Gabarito Black, jarak huruf −1,5%. Dua baris rata kiri di samping logo; tinggi huruf kapital 35% dari tinggi logo, jarak logo ke teks 10%."],
  ["Pilih versi sesuai ruang", "Dua baris sebagai versi utama, satu baris untuk header yang pendek, teks saja untuk dokumen, dan logo saja untuk ikon."],
  ["Latar gelap punya versinya sendiri", "Di latar gelap pakai versi “gelap” (kotak terang, nama lebih cerah). Warna gelap asli hampir hilang di latar gelap."],
  ["Versi kecil di 32 px ke bawah", "Favicon dan ikon kecil memakai versi tanpa pegangan dengan garis lebih tebal, supaya tetap terbaca."],
  ["Ruang kosong", "Sisakan ruang kosong minimal 25% tinggi logo di sekelilingnya. Tinggi minimal logo + teks 24 px di layar."],
  ["Jangan diubah", "Jangan memiringkan, meregangkan, memberi bayangan atau gradien, menukar warna antarbagian, atau memakai dua piktogram sekaligus."],
];

function Anatomy({ kit }: { kit: Kit }) {
  const spec = BUILTIN_LOGOS[3];
  const g = markGeometry(BOX);
  const m = markBody(spec, kit, "warna");
  const b = g.bbox;
  const A = g.anchors;
  const t = `font-family="Segoe UI, system-ui, sans-serif" font-size="30" fill="#5a6170"`;
  const line = `stroke="#858c9b" stroke-width="2" fill="none"`;
  const right = b.x + b.w + 40;
  const leftX = b.x - 40;
  const label = (from: [number, number], x: number, y: number, text: string, anchor: "start" | "end") =>
    `<path d="M${from[0].toFixed(1)} ${from[1].toFixed(1)} L${x} ${y}" ${line}/><circle cx="${from[0].toFixed(1)}" cy="${from[1].toFixed(1)}" r="5" fill="#858c9b"/>` +
    `<text x="${anchor === "start" ? x + 8 : x - 8}" y="${y + 10}" text-anchor="${anchor}" ${t}>${text}</text>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-190 40 1420 990">` +
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#cdd2da" stroke-dasharray="8 8" stroke-width="2"/>` +
    m.body +
    `<g transform="${matrixAttr(g.picto)}"><rect x="0" y="0" width="24" height="24" fill="none" stroke="#b3261e" stroke-width="0.3" stroke-dasharray="1 1"/></g>` +
    label(A.top, right, b.y + 40, "muka atas (gelap)", "start") +
    (A.handle ? label(A.handle, leftX, A.handle[1] - 120, "pegangan", "end") : "") +
    label(A.left, leftX, A.left[1] + 160, "muka kiri (gelap)", "end") +
    label(A.picto, right, A.picto[1] - 150, "area piktogram 24×24", "start") +
    label(A.panel, right, A.panel[1] + 170, "panel (terang)", "start") +
    `<text x="${b.x}" y="${b.y + b.h + 50}" ${t}>garis putus-putus: batas logo untuk ruang kosong dan perataan teks</text>` +
    `</svg>`;
  return <SvgImg className="lg-anatomy" svg={svg} alt="Anatomi logo: muka atas, muka kiri dengan pegangan, panel, dan area piktogram" />;
}

export function LogoGuide() {
  const { kit, error } = useLogoKit();
  const family = useFamily();
  const [copied, setCopied] = useState(false);
  const brief = claudeBrief({ family: "Product", name: "[Nama app]", desc: "[fungsi aplikasi]" });

  return (
    <div className="page logo-guide">
      <header className="page-head">
        <div>
          <h1>Panduan logo app</h1>
          <p>
            Aturan keluarga logo Product. Generator menerapkan semuanya otomatis; halaman ini untuk desainer, developer, dan
            siapa pun yang memakai logonya.
          </p>
        </div>
      </header>

      <div className="lg-top">
        <section className="panel rules">
          <h2>Aturan</h2>
          <ol>
            {RULES.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel">
          <h2>Anatomi</h2>
          {kit ? <Anatomy kit={kit} /> : <p className="hint">{error ?? "Memuat…"}</p>}
          <p className="hint">
            Proporsi lockup: huruf kapital {Math.round(LOCKUP.capStacked * 100)}% tinggi logo (dua baris) atau{" "}
            {Math.round(LOCKUP.capRow * 100)}% (satu baris), jarak ke teks {Math.round(LOCKUP.gap * 100)}%.
          </p>
        </section>
      </div>

      <section className="panel">
        <h2>Warna keluarga</h2>
        <div className="lg-table" role="table">
          <div role="row" className="lg-row lg-head">
            <span role="columnheader">App</span>
            <span role="columnheader">Terang</span>
            <span role="columnheader">Gelap</span>
            <span role="columnheader">Terang di latar gelap</span>
            <span role="columnheader">Kontras nama di putih</span>
          </div>
          {family.map((f) => {
            const c = contrast(f.bright, "#FFFFFF");
            return (
              <div role="row" className="lg-row" key={f.id}>
                <span role="cell">
                  {f.family} {f.name}
                </span>
                <span role="cell">
                  <i className="sw" style={{ background: f.bright }} /> <code>{f.bright}</code>
                </span>
                <span role="cell">
                  <i className="sw" style={{ background: f.dark }} /> <code>{f.dark}</code>
                </span>
                <span role="cell">
                  <i className="sw" style={{ background: brightOnDark(f.bright) }} /> <code>{brightOnDark(f.bright)}</code>
                </span>
                <span role="cell" className={c < 3 ? "lg-low" : ""}>
                  {c.toFixed(1)}:1{c < 3 ? " · pucat untuk teks kecil" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="hint">
          Logo tidak wajib memenuhi batas kontras WCAG, tetapi hijau dan biru muda cukup pucat di latar putih. Kalau nama app
          dipakai sebagai teks kecil di UI, pakai warna gelapnya.
        </p>
      </section>

      <section className="panel">
        <header className="set-head">
          <h2>Brief untuk Claude</h2>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              setCopied(await copyText(brief));
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Disalin" : "Salin brief"}
          </button>
        </header>
        <p className="hint">
          Untuk piktogram yang belum ada: salin brief ini ke Claude, ganti bagian dalam kurung siku, lalu tempel SVG hasilnya di
          Buat logo &gt; Piktogram &gt; Tempel SVG sendiri. Tombol “Minta Claude” di Buat logo mengisi nama dan fungsinya otomatis.
        </p>
        <pre className="lg-brief">{brief}</pre>
      </section>

      <p className="hint">Piktogram dari Lucide (lisensi ISC). Font Gabarito (SIL Open Font License 1.1), bebas dipakai komersial.</p>
    </div>
  );
}
