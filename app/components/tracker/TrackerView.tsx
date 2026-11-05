'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrackerResponse } from '@/app/api/trackers/[siteId]/route';
import {
  STATUS_LABEL, countTasks, groupByArea, isOpenNextStep, matchesFilter, siteLink,
  type TaskFilter, type TaskStatus, type TrackerSite,
} from '@/app/lib/trackerLogic';
import AreaCard from './AreaCard';
import FilterChips from './FilterChips';
import NextStepsPanel from './NextStepsPanel';
import SummaryBand from './SummaryBand';
import TaskRow from './TaskRow';

// The per-site "what is done and what is outstanding" view. Everything it shows
// comes from the site's file in data/trackers/, so nothing here is specific to
// any one site.

const localKey = (siteId: string) => `hub:tracker:${siteId}`;

function readLocal(siteId: string): Record<string, TaskStatus> {
  try { return JSON.parse(localStorage.getItem(localKey(siteId)) ?? '{}'); } catch { return {}; }
}
function writeLocal(siteId: string, v: Record<string, TaskStatus>) {
  try {
    if (Object.keys(v).length) localStorage.setItem(localKey(siteId), JSON.stringify(v));
    else localStorage.removeItem(localKey(siteId));
  } catch { /* storage unavailable — the change simply isn't kept */ }
}

export default function TrackerView({ siteId }: { siteId: string }) {
  const [site, setSite] = useState<TrackerSite | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [deviceOnly, setDeviceOnly] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const localRef = useRef<Record<string, TaskStatus>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trackers/${encodeURIComponent(siteId)}`)
      .then(async r => ({ status: r.status, body: (await r.json()) as TrackerResponse }))
      .then(({ status, body }) => {
        if (cancelled) return;
        if (status === 404 || !body.site) { setState(status === 404 ? 'missing' : 'error'); return; }
        let loaded = body.site;
        if (body.persistence === 'unavailable') {
          // No shared store yet: lay this device's own saved changes over the file.
          localRef.current = readLocal(siteId);
          loaded = { ...loaded, tasks: loaded.tasks.map(t => ({ ...t, status: localRef.current[t.id] ?? t.status })) };
          setDeviceOnly(true);
        } else {
          writeLocal(siteId, {});
        }
        setSite(loaded);
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [siteId]);

  const setStatus = useCallback((taskId: string, status: TaskStatus) => {
    setSite(prev => {
      if (!prev) return prev;
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task || task.status === status) return prev;
      setAnnounce(`${task.title}: now ${STATUS_LABEL[status]}`);
      return { ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, status } : t)) };
    });
    fetch(`/api/trackers/${encodeURIComponent(siteId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status }),
    })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); })
      .catch(() => {
        localRef.current = { ...localRef.current, [taskId]: status };
        writeLocal(siteId, localRef.current);
        setDeviceOnly(true);
      });
  }, [siteId]);

  const counts = useMemo(() => (site ? countTasks(site.tasks) : null), [site]);
  const nextSteps = useMemo(
    () => (site ? [...site.tasks].filter(isOpenNextStep).sort((a, b) => a.order - b.order) : []),
    [site],
  );
  // Areas keep their whole-area counts (so "x of y done" is always true); the
  // filter only decides which rows are listed under them.
  const areas = useMemo(
    () => (site ? groupByArea(site.tasks).map(a => ({ ...a, shown: a.tasks.filter(t => matchesFilter(t, filter)) })) : []),
    [site, filter],
  );
  const shownTotal = areas.reduce((n, a) => n + a.shown.length, 0);
  const link = site?.url ? siteLink(site.url) : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        style={{ color: 'var(--accent-text)' }}
      >
        ← Command Hub
      </Link>

      {state === 'loading' && <p className="mt-6 text-sm" style={{ color: 'var(--fg-2)' }}>Loading tracker…</p>}
      {state === 'missing' && (
        <p className="mt-6 text-sm" style={{ color: 'var(--fg)' }}>
          There is no tracker for “{siteId}”. Trackers come from files in <code>data/trackers/</code>.
        </p>
      )}
      {state === 'error' && (
        <p className="mt-6 text-sm" style={{ color: 'var(--warn)' }}>
          The tracker could not be loaded. Try refreshing the page.
        </p>
      )}

      {state === 'ready' && site && counts && (
        <div className="flex flex-col" style={{ gap: 'var(--space-section)' }}>
          <header className="mt-2">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: site.accent ?? 'var(--accent)' }}
              />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>{site.name}</h1>
            </div>
            {site.description && (
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>{site.description}</p>
            )}
            {(link || site.repo) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm" style={{ color: 'var(--fg-2)' }}>
                {link && (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center underline underline-offset-2"
                    style={{ color: 'var(--accent-text)' }}
                  >
                    {link.label} ↗
                  </a>
                )}
                {site.repo && (
                  <a
                    href={`https://github.com/${site.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center underline underline-offset-2"
                    style={{ color: 'var(--accent-text)' }}
                  >
                    {site.repo} ↗
                  </a>
                )}
              </p>
            )}
          </header>

          {deviceOnly && (
            <p
              role="status"
              className="p-4 text-sm"
              style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-control)' }}
            >
              <strong style={{ color: 'var(--warn)' }}>Saved on this device only.</strong>{' '}
              The shared tracker store couldn’t be reached, so changes you make stay in this browser and
              won’t show on other devices until it is back.
            </p>
          )}

          <SummaryBand counts={counts} label={site.name} headingId="overall-h" heading="Overall progress" />

          <NextStepsPanel count={nextSteps.length} headingId="next-h">
            {nextSteps.map(t => (
              <TaskRow key={t.id} task={t} onStatus={setStatus} areaLabel={t.area} />
            ))}
          </NextStepsPanel>

          <section aria-labelledby="areas-h" className="flex flex-col gap-4">
            <h2 id="areas-h" className="text-lg font-bold" style={{ color: 'var(--fg)' }}>All tasks by area</h2>
            <FilterChips value={filter} onChange={setFilter} shown={shownTotal} />
            {shownTotal === 0 && (
              <p className="text-sm" style={{ color: 'var(--fg-2)' }}>Nothing matches this filter.</p>
            )}
            {areas.filter(a => a.shown.length > 0).map(area => (
              <AreaCard
                key={`${area.name}:${filter}`}
                name={area.name}
                counts={area.counts}
                visible={area.shown.length}
                open={filter !== 'all' || area.counts.parked !== area.counts.total}
              >
                {area.shown.map(t => (
                  <TaskRow key={t.id} task={t} onStatus={setStatus} />
                ))}
              </AreaCard>
            ))}
          </section>
        </div>
      )}

      <div aria-live="polite" role="status" className="sr-only">{announce}</div>
    </main>
  );
}
