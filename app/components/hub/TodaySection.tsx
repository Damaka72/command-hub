'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ActionsResponse } from '@/app/api/actions/route';
import type { TrackersResponse } from '@/app/api/trackers/route';
import { HUB_PROJECTS } from '@/app/lib/hub/data';
import { buildToday, type TodayAction, type TodayItem, type TodayTracker } from '@/app/lib/hub/today';
import { rhythmForDay } from '@/app/lib/weeklyRhythm';
import { Card, Pill, Section, SectionHead, Notice, btnQuiet, DISPLAY_FONT } from './ui';
import { useNow } from './useNow';

const SHOWN = 6;

function Item({ item }: { item: TodayItem }) {
  const urgent = item.tone === 'urgent';
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={urgent ? 'bad' : 'neutral'} glyph={urgent ? '▲' : undefined}>{urgent ? 'Needs you first' : item.source}</Pill>
        {urgent && <span className="text-xs text-news-ink-3">{item.source}</span>}
        {item.about && <span className="text-xs font-semibold text-news-gold-ink">{item.about}</span>}
      </div>
      <p className="mt-1 text-base font-medium leading-snug">{item.title}</p>
      {item.detail && <p className="text-sm text-news-ink-2">{item.detail}</p>}
    </>
  );
  const cls = `block rounded-lg border border-news-rule border-l-4 ${urgent ? 'border-l-news-bad' : 'border-l-news-gold'} bg-news-card p-3`;
  if (!item.href) return <li className={cls}>{body}</li>;
  const external = /^https?:/.test(item.href);
  return (
    <li>
      {external
        ? <a href={item.href} target="_blank" rel="noopener noreferrer" className={`${cls} min-h-11 hover:border-news-ink-3`}>{body}</a>
        : <Link href={item.href} className={`${cls} min-h-11 hover:border-news-ink-3`}>{body}</Link>}
    </li>
  );
}

export default function TodaySection() {
  const now = useNow();
  const [actions, setActions] = useState<TodayAction[] | null>(null);
  const [trackers, setTrackers] = useState<TodayTracker[] | null>(null);
  const [partial, setPartial] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/actions?status=open')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<ActionsResponse>; })
      .then(d => { if (!cancelled) setActions(d.actions); })
      .catch(() => { if (!cancelled) { setActions([]); setPartial(true); } });
    fetch('/api/trackers')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<TrackersResponse>; })
      .then(d => { if (!cancelled) setTrackers(d.trackers); })
      .catch(() => { if (!cancelled) { setTrackers([]); setPartial(true); } });
    return () => { cancelled = true; };
  }, []);

  const ready = now !== null && actions !== null && trackers !== null;
  const items = useMemo(
    () => (ready ? buildToday({ now, projects: HUB_PROJECTS, actions, trackers }) : []),
    [ready, now, actions, trackers],
  );
  const rhythm = now ? rhythmForDay(now.getDay()) : null;
  const visible = all ? items : items.slice(0, SHOWN);

  return (
    <Section id="today">
      <SectionHead id="today-h" kicker="Today" title="What you're meant to be doing" aside={rhythm ? rhythm.dayName : undefined} />

      {rhythm && (
        <Card className="mb-3 border-l-4 border-l-news-gold">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={rhythm.who === 'you' ? 'gold' : 'ok'} glyph={rhythm.who === 'you' ? '◐' : '✓'}>{rhythm.who === 'you' ? 'Your turn' : 'Runs itself'}</Pill>
            <span className="text-xs font-semibold uppercase tracking-wide text-news-ink-3">{rhythm.badge}</span>
          </div>
          <p className="mt-1 text-lg font-semibold leading-snug" style={DISPLAY_FONT}>{rhythm.title}</p>
          <p className="mt-1 text-sm text-news-ink-2">{rhythm.description}</p>
          {rhythm.primary && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={rhythm.primary.href} className="inline-flex min-h-11 items-center rounded-lg border border-news-ink bg-news-ink px-4 text-sm font-semibold text-news-paper">{rhythm.primary.label} →</Link>
              {rhythm.secondary && <Link href={rhythm.secondary.href} className={btnQuiet}>{rhythm.secondary.label}</Link>}
            </div>
          )}
        </Card>
      )}

      {partial && <div className="mb-3"><Notice>Some of today&rsquo;s sources couldn&rsquo;t be reached, so this list may be missing items.</Notice></div>}

      {!ready ? (
        <p className="text-sm text-news-ink-2">Gathering today&rsquo;s list…</p>
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-news-ink-2">Nothing else is waiting on you. Add a next action to a project in <code>data/hub/projects.json</code>, or log one in the Hub, and it will show here.</p></Card>
      ) : (
        <>
          <ul className="flex flex-col gap-2">{visible.map(i => <Item key={i.id} item={i} />)}</ul>
          {items.length > SHOWN && (
            <button type="button" onClick={() => setAll(a => !a)} className={`${btnQuiet} mt-2`} aria-expanded={all}>
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}
