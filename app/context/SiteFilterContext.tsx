'use client';

// ── Shared site filter (UX spec §5) ───────────────────────────────────────────
// Same pattern as WeekContext: a site chosen on home carries into the
// Library. Backed by `?site=<siteId>`; empty string = "All sites".

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface SiteFilterContextValue {
  siteId:    string; // '' = all sites
  setSiteId: (siteId: string) => void;
}

const SiteFilterContext = createContext<SiteFilterContextValue | null>(null);

function readParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function writeParam(name: string, value: string) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function SiteFilterProvider({ children }: { children: React.ReactNode }) {
  const [siteId, setSiteIdState] = useState<string>(() => readParam('site') ?? '');

  useEffect(() => {
    const onPopState = () => setSiteIdState(readParam('site') ?? '');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setSiteId = useCallback((next: string) => {
    setSiteIdState(next);
    writeParam('site', next);
  }, []);

  const value = useMemo(() => ({ siteId, setSiteId }), [siteId, setSiteId]);
  return <SiteFilterContext.Provider value={value}>{children}</SiteFilterContext.Provider>;
}

export function useSiteFilter(): SiteFilterContextValue {
  const ctx = useContext(SiteFilterContext);
  if (!ctx) throw new Error('useSiteFilter must be used within a SiteFilterProvider');
  return ctx;
}
