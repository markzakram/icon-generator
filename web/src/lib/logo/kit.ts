import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Kit } from "./compose";
import { loadLucide, type LucideSet } from "./picto";
import { loadGabarito, type FontSet } from "./text";

/** A font file the user loaded replaces Gabarito for this visit (not stored). */
let customFont: FontSet | null = null;
const listeners = new Set<() => void>();

export function setCustomFont(f: FontSet | null): void {
  customFont = f;
  listeners.forEach((l) => l());
}

function useCustomFont(): FontSet | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => customFont,
  );
}

/** Loads the wordmark font and the pictogram library once for all logo screens. */
export function useLogoKit(): { kit: Kit | null; error: string | null } {
  const [base, setBase] = useState<{ font: FontSet; lucide: LucideSet } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const custom = useCustomFont();

  useEffect(() => {
    let live = true;
    Promise.all([loadGabarito(), loadLucide()])
      .then(([font, lucide]) => live && setBase({ font, lucide }))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);

  const kit = useMemo<Kit | null>(() => (base ? { font: custom ?? base.font, lucide: base.lucide } : null), [base, custom]);
  return { kit, error };
}
