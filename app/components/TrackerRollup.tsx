'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TrackersResponse } from '../api/trackers/route';
import ProgressMeter from './tracker/ProgressMeter';

// Home-page roll-up: one line per tracked site — percentage done and how many
// next steps are still open. Sites appear here by having a file in data/trackers/.

export default function TrackerRollup() {
  const [data, setData] = useState<TrackersResponse | null>(null);

  useEffect(() => {
    fetch('/api/trackers')
      .then(r => r.json())
      .then((d: TrackersResponse) => setData(d))
      .catch(() => setData(null));
  }, []);

  if (!data || data.trackers.length === 0) return null;

  return (
    <section
      aria-labelledby="rollup-h"
      className="mb-6 rounded-xl p-4"
      style={{ background: 'var(--panel)', border: '1px solid var(--line-2)' }}
    >
      <h2 id="rollup-h" className="mb-2 text-base font-bold" style={{ color: 'var(--fg)' }}>
        Site work trackers
      </h2>
      <ul className="flex flex-col">
        {data.trackers.map((t, i) => (
          <li key={t.siteId} style={{ borderTop: i === 0 ? undefined : '1px solid var(--line)' }}>
            <Link
              href={`/trackers/${encodeURIComponent(t.siteId)}`}
              className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-2.5 hover:brightness-125 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.accent ?? 'var(--hub-accent)' }} />
                <span className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t.name}</span>
              </span>
              <span className="mono-num text-right text-sm sm:order-3" style={{ color: 'var(--fg)' }}>
                <strong>{t.percentDone}%</strong> done · {t.nextSteps} next {t.nextSteps === 1 ? 'step' : 'steps'}
              </span>
              <span className="col-span-2 sm:col-span-1 sm:order-2">
                <ProgressMeter counts={t.counts} label={t.name} height={8} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
