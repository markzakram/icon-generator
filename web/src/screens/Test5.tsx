import { useEffect, useMemo, useRef, useState } from "react";
import { IconView } from "../components/IconView";
import { downloadText } from "../lib/download";
import { displayName, hasV2 } from "../lib/render";
import type { Glyph, Version } from "../lib/types";
import { useData } from "../state";

type SetKind = "v2" | "v1" | "campur";

interface Trial {
  id: string;
  version: Version;
  answer: string;
  correct: boolean;
  ms: number;
}

interface Session {
  at: string;
  participant: string;
  brand: string;
  seconds: number;
  trials: Trial[];
}

const KEY = "icon-generator.uji5.v1";

function loadSessions(): Session[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Session[];
  } catch {
    return [];
  }
}

function saveSessions(s: Session[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s.slice(0, 50)));
  } catch {
    /* storage unavailable: results live until the page is closed */
  }
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ");

/** Suggested grade: the answer shares a meaningful word with the icon's name, aliases or synonyms. */
function guessCorrect(g: Glyph, answer: string): boolean {
  const words = new Set(norm(answer).split(/\s+/).filter((w) => w.length >= 3));
  if (!words.size) return false;
  const keys = [g.nama, g.id.replace(/_/g, " "), ...g.alias, ...g.sinonim].map(norm).join(" ").split(/\s+/);
  return keys.some((k) => k.length >= 3 && [...words].some((w) => k.startsWith(w) || w.startsWith(k)));
}

function toCsv(s: Session, glyphById: Map<string, Glyph>): string {
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["waktu", "peserta", "brand", "no", "glyph", "versi", "nama_icon", "jawaban", "benar", "detik_menjawab"]];
  s.trials.forEach((t, i) =>
    rows.push([
      s.at,
      s.participant,
      s.brand,
      String(i + 1),
      t.id,
      t.version,
      glyphById.get(t.id)?.nama ?? t.id,
      t.answer,
      t.correct ? "ya" : "tidak",
      (t.ms / 1000).toFixed(1),
    ]),
  );
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function score(trials: Trial[], v?: Version): string {
  const list = v ? trials.filter((t) => t.version === v) : trials;
  if (!list.length) return "–";
  return `${Math.round((list.filter((t) => t.correct).length / list.length) * 100)}%`;
}

export function Test5() {
  const { brand, glyphs, glyphById } = useData();
  const pool = useMemo(() => glyphs.filter(hasV2), [glyphs]);
  const [setKind, setSetKind] = useState<SetKind>("campur");
  const [count, setCount] = useState(12);
  const [seconds, setSeconds] = useState(5);
  const [participant, setParticipant] = useState("");
  const [phase, setPhase] = useState<"setup" | "show" | "answer" | "done">("setup");
  const [queue, setQueue] = useState<{ glyph: Glyph; version: Version }[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [left, setLeft] = useState(seconds);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const shownAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function start() {
    const picks = shuffle(pool).slice(0, count);
    const half = shuffle(picks.map((_, i) => i < Math.ceil(picks.length / 2)));
    setQueue(
      picks.map((glyph, i) => ({
        glyph,
        version: setKind === "campur" ? (half[i] ? "v2" : "v1") : setKind,
      })),
    );
    setTrials([]);
    setIdx(0);
    setPhase("show");
  }

  // show the icon for N seconds, then ask
  useEffect(() => {
    if (phase !== "show") return;
    setLeft(seconds);
    const started = Date.now();
    const t = window.setInterval(() => {
      const remain = seconds - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, remain));
      if (Date.now() - started >= seconds * 1000) {
        window.clearInterval(t);
        setAnswer("");
        shownAt.current = Date.now();
        setPhase("answer");
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [phase, idx, seconds]);

  useEffect(() => {
    if (phase === "answer") inputRef.current?.focus();
  }, [phase]);

  function submit(text: string) {
    const cur = queue[idx];
    const trial: Trial = {
      id: cur.glyph.id,
      version: cur.version,
      answer: text.trim(),
      correct: guessCorrect(cur.glyph, text),
      ms: Date.now() - shownAt.current,
    };
    const next = [...trials, trial];
    setTrials(next);
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      setPhase("show");
    } else {
      const session: Session = {
        at: new Date().toISOString().slice(0, 16).replace("T", " "),
        participant: participant.trim() || "Tanpa nama",
        brand: brand.name,
        seconds,
        trials: next,
      };
      const all = [session, ...sessions];
      setSessions(all);
      saveSessions(all);
      setPhase("done");
    }
  }

  function toggleCorrect(i: number) {
    const next = trials.map((t, j) => (j === i ? { ...t, correct: !t.correct } : t));
    setTrials(next);
    const all = sessions.map((s, j) => (j === 0 ? { ...s, trials: next } : s));
    setSessions(all);
    saveSessions(all);
  }

  if (phase === "show" || phase === "answer") {
    const cur = queue[idx];
    return (
      <div className="page test5">
        <div className="panel test-stage">
          <p className="test-count">
            {idx + 1} / {queue.length}
          </p>
          {phase === "show" ? (
            <>
              <div className="test-icon">
                <IconView glyph={cur.glyph} brand={brand} size={168} version={cur.version} thumb={false} />
              </div>
              <div className="test-bar">
                <span style={{ width: `${(left / seconds) * 100}%` }} />
              </div>
              <p className="hint">Perhatikan icon ini. Setelah {seconds} detik, icon disembunyikan.</p>
            </>
          ) : (
            <form
              className="test-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit(answer);
              }}
            >
              <label className="field">
                <span>Menurut Anda, icon tadi untuk menu apa?</span>
                <input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="misalnya materi, jadwal, tryout" />
              </label>
              <div className="actions">
                <button type="submit" className="btn btn-primary">
                  Lanjut
                </button>
                <button type="button" className="btn" onClick={() => submit("")}>
                  Tidak tahu
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const last = phase === "done" ? sessions[0] : null;

  return (
    <div className="page test5">
      <header className="page-head">
        <div>
          <h1>Uji 5 detik</h1>
          <p>
            Tunjukkan icon tanpa label ke 10–15 pengguna, lalu minta mereka menebak artinya. Hasil v1 dan v2 dibandingkan
            otomatis. Data tersimpan di browser ini dan bisa diunduh sebagai CSV.
          </p>
        </div>
      </header>

      {last && (
        <section className="panel">
          <header className="set-head">
            <h2>
              Hasil {last.participant}: {score(trials)} benar
            </h2>
            <div className="page-tools">
              <span className="pill">v1 {score(trials, "v1")}</span>
              <span className="pill pill-accent">v2 {score(trials, "v2")}</span>
              <button type="button" className="btn" onClick={() => downloadText(toCsv({ ...last, trials }, glyphById), "uji5_hasil.csv", "text/csv")}>
                Unduh CSV
              </button>
            </div>
          </header>
          <p className="hint-line">Penilaian otomatis bisa salah; klik “benar/salah” untuk mengoreksi.</p>
          <div className="result-list">
            {trials.map((t, i) => {
              const g = glyphById.get(t.id)!;
              return (
                <div key={i} className="result-row">
                  <IconView glyph={g} brand={brand} size={40} version={t.version} />
                  <span className="result-name">
                    {displayName(g, t.version)} <em>{t.version}</em>
                  </span>
                  <span className="result-answer">{t.answer || "tidak tahu"}</span>
                  <button type="button" className={`pill ${t.correct ? "pill-ok" : "pill-bad"}`} onClick={() => toggleCorrect(i)}>
                    {t.correct ? "benar" : "salah"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel form test-setup">
        <h2>{last ? "Uji peserta berikutnya" : "Mulai uji"}</h2>
        <label className="field">
          <span>Nama peserta</span>
          <input value={participant} onChange={(e) => setParticipant(e.target.value)} placeholder="opsional" />
        </label>
        <fieldset>
          <legend>Icon yang diuji ({brand.name})</legend>
          {(
            [
              ["campur", "Campur v1 dan v2 (disarankan)", "setiap icon muncul sekali, versi acak"],
              ["v2", "Hanya v2", ""],
              ["v1", "Hanya v1", ""],
            ] as [SetKind, string, string][]
          ).map(([k, label, hint]) => (
            <label key={k} className="radio">
              <input type="radio" name="set" checked={setKind === k} onChange={() => setSetKind(k)} />
              <span>
                {label} {hint && <em>{hint}</em>}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="two">
          <label className="field">
            <span>Jumlah icon</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[8, 12, pool.length].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Lama tampil</span>
            <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
              {[3, 5, 8].map((n) => (
                <option key={n} value={n}>
                  {n} detik
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="btn btn-primary" onClick={start}>
          Mulai
        </button>
      </section>

      {sessions.length > 0 && (
        <section className="panel">
          <h2>Riwayat di browser ini</h2>
          <div className="result-list">
            {sessions.map((s, i) => (
              <div key={i} className="result-row history">
                <span className="result-name">
                  {s.participant} <em>{s.at}</em>
                </span>
                <span>{s.brand}</span>
                <span className="pill">v1 {score(s.trials, "v1")}</span>
                <span className="pill pill-accent">v2 {score(s.trials, "v2")}</span>
                <button type="button" className="link" onClick={() => downloadText(toCsv(s, glyphById), `uji5_${i + 1}.csv`, "text/csv")}>
                  CSV
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
