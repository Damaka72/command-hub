'use client';

import { useEffect, useMemo, useState } from 'react';
import type { HealthResponse } from '@/app/api/hub/health/route';
import { HUB_PROJECTS, HUB_SITES } from '@/app/lib/hub/data';
import { INSIGHT_KIND_LABEL, buildInsights } from '@/app/lib/hub/insights';
import { Card, Pill, Section, SectionHead, DISPLAY_FONT, type Tone } from './ui';
import { useNow } from './useNow';

const KIND_TONE: Record<string, { tone: Tone; glyph: string }> = {
  think: { tone: 'gold', glyph: '✦' },
  discuss: { tone: 'neutral', glyph: '⇄' },
  advice: { tone: 'neutral', glyph: '?' },
};

export default function InsightsSection() {
  const now = useNow();
  const [down, setDown] = useState<Set<string>>(new Set());

  // A site being down is itself worth a prompt, so ask the health route
  // (the Health check section is already calling it; this is one cheap extra call).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/hub/health')
      .then(r => (r.ok ? (r.json() as Promise<HealthResponse>) : null))
      .then(d => { if (!cancelled && d) setDown(new Set(d.sites.filter(s => s.state === 'down').map(s => s.id))); })
      .catch(() => { /* no health data: the prompts simply don't mention it */ });
    return () => { cancelled = true; };
  }, []);

  const insights = useMemo(
    () => (now ? buildInsights({ now, projects: HUB_PROJECTS, siteDown: down, sites: HUB_SITES }) : []),
    [now, down],
  );

  return (
    <Section id="insights">
      <SectionHead id="insights-h" kicker="Insights" title="Didi, have you thought about…" />
      {insights.length === 0 ? (
        <p className="text-sm text-news-ink-2">Thinking…</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {insights.map(i => (
            <li key={i.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={KIND_TONE[i.kind].tone} glyph={KIND_TONE[i.kind].glyph}>{INSIGHT_KIND_LABEL[i.kind]}</Pill>
                </div>
                <p className="text-lg leading-snug" style={DISPLAY_FONT}>{i.prompt}</p>
                <p className="mt-auto text-xs text-news-ink-3">
                  <span className="font-semibold text-news-gold-ink">{i.about}</span>
                  {i.withWhom && <> · with {i.withWhom}</>}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
