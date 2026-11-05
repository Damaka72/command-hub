'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { TrackersResponse } from '../api/trackers/route';
import { SITES } from '../lib/sites';
import { siteColor } from '../lib/siteColors';
import {
  OWNER_LABEL, STATUS_LABEL, siteLink, sumCounts,
  type TrackerSummary,
} from '../lib/trackerLogic';
import NextStepsPanel from './tracker/NextStepsPanel';
import SummaryBand from './tracker/SummaryBand';
import ThinBar from './tracker/ThinBar';
import { STATUS_STYLE } from './tracker/statusStyle';

// The home page's work overview, in the same layout as a tracker page:
// summary band, "Your next steps", then one card per managed site.
// A site gets a tracker by having a file in data/trackers/; a site without one
// still gets a card, saying so.

interface CardSite {
  id:      string;
  name:    string;
  url?:    string;
  accent:  string;
  tracker: TrackerSummary | null;
}

function SiteSummaryCard({ site }: { site: CardSite }) {
  const t = site.tracker;
  const link = site.url ? siteLink(site.url) : null;
  const headingId = `site-card-${site.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-4 p-5"
      style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-card)' }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="flex items-center gap-2 text-base font-bold" style={{ color: 'var(--fg)' }}>
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: site.accent }} />
            <span className="truncate">{site.name}</span>
          </h3>
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex min-h-9 items-center truncate text-sm underline underline-offset-2"
              style={{ color: 'var(--accent-text)' }}
            >
              {link.label} ↗
            </a>
          )}
        </div>
        {t && (
          <span className="mono-num text-3xl font-semibold leading-none" style={{ color: 'var(--fg)' }}>
            {t.percentDone}%
          </span>
        )}
      </header>

      {t ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="mono-num text-sm" style={{ color: 'var(--fg-2)' }}>
              {t.counts.done} of {t.counts.total} done
              {t.counts.parked > 0 && <> · {t.counts.parked} parked</>}
            </p>
            <ThinBar done={t.counts.done} total={t.counts.total} label={t.name} />
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="mono-num text-sm font-semibold" style={{ color: t.nextSteps > 0 ? 'var(--accent-text)' : 'var(--fg-2)' }}>
              {t.nextSteps} next {t.nextSteps === 1 ? 'step' : 'steps'}
            </span>
            <Link
              href={`/trackers/${encodeURIComponent(t.siteId)}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--accent-text)' }}
            >
              Open tracker →
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-auto text-sm" style={{ color: 'var(--fg-2)' }}>
          No tracker yet. Add <code className="break-all">data/trackers/{site.id}.json</code> to start one.
        </p>
      )}
    </article>
  );
}

export default function HomeTrackers() {
  const [data, setData] = useState<TrackersResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/trackers')
      .then(r => r.json())
      .then((d: TrackersResponse) => { if (d.error) setFailed(true); else setData(d); })
      .catch(() => setFailed(true));
  }, []);

  const cards = useMemo<CardSite[]>(() => {
    const byId = new Map((data?.trackers ?? []).map(t => [t.siteId, t]));
    const fromSites = SITES.map(s => ({
      id: s.id,
      name: s.name,
      // A tracker's own address wins; otherwise the site list's.
      url: byId.get(s.id)?.url ?? s.url,
      accent: siteColor(s.id).accent,
      tracker: byId.get(s.id) ?? null,
    }));
    const known = new Set(SITES.map(s => s.id));
    const extra = (data?.trackers ?? [])
      .filter(t => !known.has(t.siteId))
      .map(t => ({ id: t.siteId, name: t.name, url: t.url, accent: t.accent ?? siteColor(t.siteId).accent, tracker: t }));
    // Sites with a tracker come first, in the order the site list gives them.
    return [...fromSites, ...extra].sort((x, y) => Number(!!y.tracker) - Number(!!x.tracker));
  }, [data]);

  const trackers = data?.trackers ?? [];
  const nextRows = trackers.flatMap(t => t.nextTasks.map(task => ({ task, site: t })));

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-section)' }}>
      {failed && (
        <p role="status" className="p-4 text-sm" style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-control)' }}>
          <strong style={{ color: 'var(--warn)' }}>The work trackers could not be loaded.</strong> Refresh to try again.
        </p>
      )}

      {trackers.length > 0 && (
        <SummaryBand
          counts={sumCounts(trackers.map(t => t.counts))}
          label="All tracked sites"
          noun="tasks across all tracked sites"
          headingId="home-summary-h"
          heading="Overall progress across all tracked sites"
        />
      )}

      {trackers.length > 0 && (
        <NextStepsPanel count={nextRows.length} headingId="home-next-h">
          {nextRows.map(({ task, site }) => {
            const st = STATUS_STYLE[task.status];
            return (
              <li key={`${site.siteId}/${task.id}`} style={{ borderTop: '1px solid var(--line)' }}>
                <Link
                  href={`/trackers/${encodeURIComponent(site.siteId)}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:brightness-125 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>
                      {site.name} · {task.area}
                    </span>
                    <span className="block text-sm font-medium leading-snug" style={{ color: 'var(--fg)' }}>{task.title}</span>
                    <span className="block text-xs" style={{ color: 'var(--fg-2)' }}>{OWNER_LABEL[task.owner]}</span>
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${st.color} 12%, var(--panel))`,
                      color: st.color,
                      border: `1.5px solid ${st.color}`,
                    }}
                  >
                    <span aria-hidden="true">{st.glyph}</span>
                    {STATUS_LABEL[task.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </NextStepsPanel>
      )}

      <section aria-labelledby="home-sites-h" className="flex flex-col gap-4">
        <h2 id="home-sites-h" className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
          Your sites <span className="mono-num font-semibold" style={{ color: 'var(--fg-2)' }}>({cards.length})</span>
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map(c => <SiteSummaryCard key={c.id} site={c} />)}
        </div>
      </section>
    </div>
  );
}
