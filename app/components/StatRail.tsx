'use client';

import { useEffect, useState } from 'react';
import Sparkline from './ui/Sparkline';
import { formatWeekChip } from '@/app/lib/weekDates';
import type { HomeResponse } from '@/app/api/home/route';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeNextOut(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

function Stat({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span className="mono-num text-lg font-semibold" style={{ color: valueColor ?? 'var(--fg)' }}>{value}</span>
    </div>
  );
}

export default function StatRail({ week, home }: { week: string; home: HomeResponse | null }) {
  const [greetingText, setGreetingText] = useState('Good morning');

  useEffect(() => {
    // The server has no reliable local hour for Didi, so the real greeting is
    // resolved post-mount from the browser's clock (client only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreetingText(greeting(new Date().getHours()));
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--fg)' }}>{greetingText}, Didi</h1>
        <span
          className="mono-num rounded-full px-2.5 py-1 text-[13px] font-medium"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}
        >
          {formatWeekChip(week)}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Stat
          label="Streak"
          value={home ? `${home.streak}w` : '—'}
          valueColor={home && home.streak > 0 ? 'var(--ok)' : undefined}
        />
        <Stat label="Planned" value={home ? home.plannedTotal : '—'} />
        <Stat
          label="In review"
          value={home ? home.inReviewTotal : '—'}
          valueColor={home && home.inReviewTotal > 0 ? 'var(--warn)' : undefined}
        />
        <Stat label="Next out" value={home ? relativeNextOut(home.nextOut) : '—'} />
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-3)' }}>Last 8 weeks</span>
          {home ? <Sparkline data={home.sparkline} /> : <span className="text-lg" style={{ color: 'var(--fg-3)' }}>—</span>}
        </div>
      </div>
    </div>
  );
}
