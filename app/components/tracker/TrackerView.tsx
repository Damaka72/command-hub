'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TrackerResponse } from '@/app/api/trackers/[siteId]/route';
import {
  STATUS_LABEL, countTasks, groupByArea, isOpenNextStep, percentDone,
  type TaskStatus, type TrackerSite,
} from '@/app/lib/trackerLogic';
import ProgressMeter from './ProgressMeter';
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
  const areas = useMemo(() => (site ? groupByArea(site.tasks) : []), [site]);
  const nextSteps = useMemo(
    () => (site ? [...site.tasks].filter(isOpenNextStep).sort((a, b) => a.order - b.order) : []),
    [site],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline"
        style={{ color: 'var(--hub-accent-text)' }}
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
        <>
          <header className="mt-2">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: site.accent ?? 'var(--hub-accent)' }}
              />
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>{site.name}</h1>
            </div>
            {site.description && (
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>{site.description}</p>
            )}
            {(site.url || site.repo) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--fg-2)' }}>
                {site.url && <span>{site.url}</span>}
                {site.repo && (
                  <a
                    href={`https://github.com/${site.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center underline underline-offset-2"
                    style={{ color: 'var(--hub-accent-text)' }}
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
              className="mt-4 rounded-lg p-3 text-sm"
              style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--warn)' }}
            >
              <strong style={{ color: 'var(--warn)' }}>Saved on this device only.</strong>{' '}
              The shared tracker store isn’t set up yet, so changes you make stay in this browser and
              won’t show on other devices.
            </p>
          )}

          {/* ── Overall progress ── */}
          <section
            aria-labelledby="overall-h"
            className="mt-5 rounded-xl p-4"
            style={{ background: 'var(--panel)', border: '1px solid var(--line-2)' }}
          >
            <h2 id="overall-h" className="sr-only">Overall progress</h2>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="mono-num text-5xl font-semibold leading-none" style={{ color: 'var(--fg)' }}>
                {percentDone(counts)}%
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-2)' }}>
                done · {counts.done} of {counts.total} tasks
              </span>
            </div>
            <ProgressMeter counts={counts} label={site.name} height={16} legend />
            {counts.parked > 0 && (
              <p className="mt-3 text-xs" style={{ color: 'var(--fg-2)' }}>
                Parked tasks are deliberately not started yet; they still count towards the total.
              </p>
            )}
          </section>

          {/* ── Your next steps ── */}
          <section aria-labelledby="next-h" className="mt-6">
            <h2 id="next-h" className="mb-2 text-base font-bold" style={{ color: 'var(--fg)' }}>
              Your next steps <span className="mono-num font-normal" style={{ color: 'var(--fg-2)' }}>({nextSteps.length})</span>
            </h2>
            {nextSteps.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--fg-2)' }}>Nothing flagged as a next step right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {nextSteps.map(t => (
                  <TaskRow key={t.id} task={t} onStatus={setStatus} />
                ))}
              </ul>
            )}
          </section>

          {/* ── Tasks by area ── */}
          <section aria-labelledby="areas-h" className="mt-8">
            <h2 id="areas-h" className="mb-2 text-base font-bold" style={{ color: 'var(--fg)' }}>All tasks by area</h2>
            <div className="flex flex-col gap-3">
              {areas.map(area => (
                <details
                  key={area.name}
                  open={area.counts.parked !== area.counts.total}
                  className="rounded-xl"
                  style={{ background: 'var(--panel)', border: '1px solid var(--line-2)' }}
                >
                  <summary className="flex min-h-11 cursor-pointer flex-col gap-2 p-3">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{area.name}</span>
                      <span className="mono-num shrink-0 text-xs" style={{ color: 'var(--fg-2)' }}>
                        {area.counts.done}/{area.counts.total} done
                      </span>
                    </span>
                    <ProgressMeter counts={area.counts} label={area.name} height={8} />
                  </summary>
                  <ul className="flex flex-col gap-2 p-3 pt-0">
                    {area.tasks.map(t => (
                      <TaskRow key={t.id} task={t} onStatus={setStatus} />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        </>
      )}

      <div aria-live="polite" role="status" className="sr-only">{announce}</div>
    </main>
  );
}
