'use client';

// ── Shared week state (UX spec §5) ────────────────────────────────────────────
// Today /plan, /review and /friday each own an independent date input, so
// moving between them means re-selecting the same date up to three times.
// This lifts week-commencing into one provider at the app layout level,
// backed by a `?week=YYYY-MM-DD` search param so it survives a refresh and is
// shareable. Default on load: the Monday of the current week.
//
// Deliberately avoids `useSearchParams` (which forces every page that reads
// it into a Suspense boundary at build time) — this dashboard is entirely
// client-rendered behind auth, so reading `window.location.search` directly
// in a lazy state initialiser is simpler and gives the same result.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mondayOf } from '../lib/weekDates';

interface WeekContextValue {
  week:    string; // Monday, YYYY-MM-DD
  setWeek: (week: string) => void;
}

const WeekContext = createContext<WeekContextValue | null>(null);

function readParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function writeParam(name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeekState] = useState<string>(() => readParam('week') ?? mondayOf());

  // Keep in sync with browser back/forward.
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readParam('week');
      if (fromUrl) setWeekState(fromUrl);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setWeek = useCallback((next: string) => {
    setWeekState(next);
    writeParam('week', next);
  }, []);

  const value = useMemo(() => ({ week, setWeek }), [week, setWeek]);
  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}

export function useWeek(): WeekContextValue {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error('useWeek must be used within a WeekProvider');
  return ctx;
}
