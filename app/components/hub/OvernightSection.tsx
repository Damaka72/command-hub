'use client';

import { useEffect, useState } from 'react';
import type { OvernightResponse } from '@/app/api/hub/overnight/route';
import { Card, Pill, Section, SectionHead } from './ui';
import { timeAgo } from '@/app/lib/hub/dates';

// Emails and industry news that arrived overnight. Both feeds are placeholders
// for now (see app/api/hub/overnight/route.ts); this section already renders
// real items as soon as the route returns them.

function Empty({ what, detail }: { what: string; detail: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Pill tone="neutral" glyph="○">Not connected yet</Pill>
      <p className="text-sm text-news-ink-2">{what}</p>
      <p className="text-xs text-news-ink-3">{detail}</p>
    </div>
  );
}

export default function OvernightSection() {
  const [data, setData] = useState<OvernightResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/hub/overnight')
      .then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<OvernightResponse>; })
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Section id="overnight">
      <SectionHead id="overnight-h" kicker="Overnight" title="What came in while you slept" />
      {failed ? (
        <Card><p className="text-sm text-news-ink-2">Overnight couldn&rsquo;t be loaded. Try refreshing the page.</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Emails worth your attention</h3>
            {data?.emails.connected && data.emails.items.length ? (
              <ul className="flex flex-col gap-2">
                {data.emails.items.map(m => (
                  <li key={m.id} className="border-b border-news-rule pb-2 last:border-0">
                    <p className="text-sm font-semibold">{m.subject}</p>
                    <p className="text-xs text-news-ink-3">{m.from} · {timeAgo(m.receivedAt)}</p>
                    <p className="text-sm text-news-ink-2">{m.snippet}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty what="Relevant emails from overnight will appear here, grouped by site or project." detail="Waiting to be connected to Gmail." />
            )}
          </Card>
          <Card>
            <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>Industry news</h3>
            {data?.news.connected && data.news.items.length ? (
              <ul className="flex flex-col gap-2">
                {data.news.items.map(n => (
                  <li key={n.id} className="border-b border-news-rule pb-2 last:border-0">
                    <a href={n.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline underline-offset-2">{n.headline}</a>
                    <p className="text-xs text-news-ink-3">{n.source} · {n.topic} · {timeAgo(n.publishedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <Empty what="Headlines from your industries will appear here." detail="Waiting for a news source. It will cover:" />
                {data?.watching && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {data.watching.map(w => <li key={w}><Pill tone="gold">{w}</Pill></li>)}
                  </ul>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </Section>
  );
}
