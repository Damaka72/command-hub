// ── Faith header: shape, defaults and validation ─────────────────────────────
// Shared by the API route (validates what is saved) and the client (renders
// it). Everything here is Didi's own words, so the only rules are length limits
// and shape; nothing is rewritten.

export interface FaithState {
  /** Today's Word. `date` is the local day it was set for (YYYY-MM-DD). */
  word:   { reference: string; text: string; date: string } | null;
  /** A typed-over Bible reading for one day, for when she follows a specific plan. */
  bible:  { reading: string; date: string } | null;
  prayerPoints: string[];
  /** `until` is the last day of the fast (YYYY-MM-DD) or null if open-ended. */
  fast:   { focus: string; detail: string; until: string | null } | null;
}

export const EMPTY_FAITH: FaithState = { word: null, bible: null, prayerPoints: [], fast: null };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' ? v.trim().slice(0, max) : null;

/** Validates a partial update. Returns only the keys that were present and valid, or an error. */
export function parseFaithPatch(body: unknown): { patch: Partial<FaithState> } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const patch: Partial<FaithState> = {};

  if ('word' in b) {
    if (b.word === null) patch.word = null;
    else {
      const w = b.word as Record<string, unknown>;
      const text = str(w?.text, 800), reference = str(w?.reference, 100), date = str(w?.date, 10);
      if (text === null || reference === null || date === null || !ISO.test(date)) return { error: 'word needs text, reference and a YYYY-MM-DD date' };
      patch.word = text || reference ? { text, reference, date } : null;
    }
  }
  if ('bible' in b) {
    if (b.bible === null) patch.bible = null;
    else {
      const w = b.bible as Record<string, unknown>;
      const reading = str(w?.reading, 120), date = str(w?.date, 10);
      if (reading === null || date === null || !ISO.test(date)) return { error: 'bible needs a reading and a YYYY-MM-DD date' };
      patch.bible = reading ? { reading, date } : null;
    }
  }
  if ('prayerPoints' in b) {
    if (!Array.isArray(b.prayerPoints) || b.prayerPoints.length > 12) return { error: 'prayerPoints must be a list of at most 12' };
    const pts = b.prayerPoints.map(p => str(p, 200));
    if (pts.some(p => p === null)) return { error: 'prayerPoints must all be text' };
    patch.prayerPoints = (pts as string[]).filter(Boolean);
  }
  if ('fast' in b) {
    if (b.fast === null) patch.fast = null;
    else {
      const f = b.fast as Record<string, unknown>;
      const focus = str(f?.focus, 200), detail = str(f?.detail ?? '', 500);
      const until = f?.until === null || f?.until === '' || f?.until === undefined ? null : str(f.until, 10);
      if (focus === null || detail === null || (until !== null && !ISO.test(until))) return { error: 'fast needs a focus, and until as YYYY-MM-DD or empty' };
      patch.fast = focus ? { focus, detail, until } : null;
    }
  }
  return { patch };
}

export function mergeFaith(base: FaithState, patch: Partial<FaithState>): FaithState {
  return { ...base, ...patch };
}

/** Tolerant read of whatever is stored (the column is free-form JSON). */
export function normaliseFaith(raw: unknown): FaithState {
  const r = parseFaithPatch(raw ?? {});
  return 'patch' in r ? mergeFaith(EMPTY_FAITH, r.patch) : EMPTY_FAITH;
}
