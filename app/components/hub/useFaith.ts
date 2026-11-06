'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaithResponse } from '@/app/api/hub/faith/route';
import { EMPTY_FAITH, mergeFaith, normaliseFaith, type FaithState } from '@/app/lib/hub/faith';

// Loads the faith settings and saves edits. Edits show at once; if the shared
// store can't be reached they're kept in this browser instead and `deviceOnly`
// is true so the page can say so (same approach as the site trackers).

const LOCAL_KEY = 'hub:faith';

function readLocal(): Partial<FaithState> {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'); } catch { return {}; }
}
function writeLocal(v: Partial<FaithState>) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(v)); } catch { /* storage unavailable: the edit simply isn't kept */ }
}

export function useFaith() {
  const [faith, setFaith] = useState<FaithState>(EMPTY_FAITH);
  const [loaded, setLoaded] = useState(false);
  const [deviceOnly, setDeviceOnly] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const localRef = useRef<Partial<FaithState>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/hub/faith')
      .then(r => r.json() as Promise<FaithResponse>)
      .then(body => {
        if (cancelled) return;
        let next = normaliseFaith(body.faith);
        if (body.persistence === 'unavailable') {
          localRef.current = readLocal();
          next = mergeFaith(next, localRef.current);
          setDeviceOnly(true);
        }
        setFaith(next);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        localRef.current = readLocal();
        setFaith(mergeFaith(EMPTY_FAITH, localRef.current));
        setDeviceOnly(true);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (patch: Partial<FaithState>) => {
    setFaith(prev => mergeFaith(prev, patch));
    setSaveError(false);
    try {
      const r = await fetch('/api/hub/faith', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (r.status === 400) { setSaveError(true); return; }
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      localRef.current = { ...localRef.current, ...patch };
      writeLocal(localRef.current);
      setDeviceOnly(true);
    }
  }, []);

  return { faith, loaded, deviceOnly, saveError, save };
}
