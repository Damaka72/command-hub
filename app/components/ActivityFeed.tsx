"use client";

import { useEffect, useState, useCallback } from "react";
import type { ActivityEvent, ActivityLevel } from "../api/activity/route";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (diff < 60000) return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const LEVEL_DOT: Record<ActivityLevel, string> = {
  success: '#34d399',
  warning: '#fbbf24',
  error:   '#f87171',
  running: '#22d3ee',
  info:    '#94a3b8',
};

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  const load = useCallback(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then((d: { events: ActivityEvent[] }) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hub-text-1)' }}>Activity</h2>
          <p className="text-[13px]" style={{ color: 'var(--hub-text-3)' }}>What has happened — pipeline runs, newest first</p>
        </div>
        <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: 'var(--hub-text-3)' }}>
          {events === null ? 'Loading…' : `${events.length} event${events.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {events === null ? (
        <div className="py-6 text-center text-xs" style={{ color: 'var(--hub-text-3)' }}>Loading activity…</div>
      ) : events.length === 0 ? (
        <div className="rounded-lg py-8 text-center" style={{ background: 'var(--hub-surface-2)', border: '1px dashed var(--hub-border)' }}>
          <p className="text-xs" style={{ color: 'var(--hub-text-2)' }}>No pipeline runs recorded yet.</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            Runs will appear here as they happen — trigger one above or wait for Sunday&rsquo;s scheduled run.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0">
          {events.map((e, i) => (
            <li key={e.id} className="relative flex gap-3 pb-4">
              {/* timeline rail */}
              {i < events.length - 1 && (
                <span className="absolute left-[5px] top-4 bottom-0 w-px" style={{ background: 'var(--hub-border)' }} />
              )}
              <span
                className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${e.level === 'running' ? 'animate-hub-pulse' : ''}`}
                style={{ background: LEVEL_DOT[e.level], boxShadow: `0 0 6px ${LEVEL_DOT[e.level]}80` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-medium" style={{ color: 'var(--hub-text-1)' }}>
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.title}</a>
                    ) : e.title}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: 'var(--hub-text-3)' }}>{relativeTime(e.at)}</span>
                </div>
                {e.detail && (
                  <p className="mt-0.5 truncate text-[13px]" style={{ color: 'var(--hub-text-2)' }}>{e.detail}</p>
                )}
                {e.meta.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.meta.map((m, j) => (
                      <span
                        key={j}
                        className="rounded-full px-1.5 py-0.5 text-[11px]"
                        style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)', color: 'var(--hub-text-3)' }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
