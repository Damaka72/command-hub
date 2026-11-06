'use client';

import { useSyncExternalStore } from 'react';

// The device's clock, ticking once a minute. Returns null during server render
// and hydration (the server doesn't know Didi's local day), then the real time,
// so nothing date-dependent is ever rendered from the wrong clock.
let current: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) {
    current = Date.now();
    timer = setInterval(() => { current = Date.now(); listeners.forEach(l => l()); }, 60_000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) { clearInterval(timer); timer = undefined; }
  };
}

export function useNow(): Date | null {
  const ms = useSyncExternalStore(
    subscribe,
    () => current ?? (current = Date.now()),
    () => null,
  );
  return ms === null ? null : new Date(ms);
}
