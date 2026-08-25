"use client";

// ── Today Focus ──────────────────────────────────────────────────────────
// The first thing anyone sees on Home: what today's job is, and a button
// straight to the page that does it. Below it, a 7-step strip of the whole
// weekly rhythm (Sat → Fri) so a newcomer can see the whole cycle at a
// glance and where today sits in it, not just today in isolation.

import { useEffect, useState } from "react";
import { WEEKLY_RHYTHM_ORDER, rhythmForDay, type RhythmDay } from "../lib/weeklyRhythm";

function RhythmStep({ day, isToday }: { day: RhythmDay; isToday: boolean }) {
  const content = (
    <div
      className="flex min-w-[84px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition-all"
      style={isToday
        ? { background: day.accentBg, border: `1px solid ${day.accentBorder}`, boxShadow: `0 0 0 1px ${day.accentBorder}` }
        : { background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)', opacity: 0.75 }
      }
    >
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: isToday ? day.accent : 'var(--hub-text-3)' }}>
        {day.dayShort}
      </span>
      <span className="text-[12px] font-medium leading-tight" style={{ color: isToday ? 'var(--hub-text-1)' : 'var(--hub-text-3)' }}>
        {day.stepLabel}
      </span>
      {isToday && (
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: day.accent }}>Today</span>
      )}
    </div>
  );

  if (!day.primary) return content;
  return (
    <a href={day.primary.href} className="contents">
      {content}
    </a>
  );
}

export default function TodayFocus() {
  // Resolved post-mount (client only) — the server has no reliable local day
  // for Didi, same pattern as the header's greeting logic elsewhere in the Hub.
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDayOfWeek(new Date().getDay());
  }, []);

  const today = dayOfWeek === null ? null : rhythmForDay(dayOfWeek);

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border-hi)' }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest"
              style={{
                background: today?.accentBg ?? 'var(--hub-surface-2)',
                color: today?.accent ?? 'var(--hub-text-3)',
                border: `1px solid ${today?.accentBorder ?? 'var(--hub-border)'}`,
              }}
            >
              {today ? `Today · ${today.dayName}` : 'Today'}
            </span>
            {today && (
              <span className="text-[12px] font-medium" style={{ color: 'var(--hub-text-3)' }}>
                {today.who === 'you' ? 'Your turn' : 'Runs itself'}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-base font-semibold" style={{ color: 'var(--hub-text-1)' }}>
            {today ? today.title : 'Loading today’s focus…'}
          </h2>
          {today && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed" style={{ color: 'var(--hub-text-2)' }}>
              {today.description}
            </p>
          )}
        </div>

        {today?.primary && (
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={today.primary.href}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: today.accent, color: 'var(--hub-accent-ink)' }}
            >
              {today.primary.label} →
            </a>
            {today.secondary && (
              <a
                href={today.secondary.href}
                className="rounded-lg px-3 py-2 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }}
              >
                {today.secondary.label}
              </a>
            )}
          </div>
        )}
      </div>

      {/* The whole cycle, Saturday → Friday, today highlighted */}
      <div className="mt-4 flex flex-wrap gap-1.5 sm:flex-nowrap">
        {WEEKLY_RHYTHM_ORDER.map(day => (
          <RhythmStep key={day.dayOfWeek} day={day} isToday={day.dayOfWeek === dayOfWeek} />
        ))}
      </div>

      <p className="mt-3 text-[12px]" style={{ color: 'var(--hub-text-3)' }}>
        New to the Hub? The <a href="/guide" className="underline hover:brightness-125" style={{ color: 'var(--hub-text-2)' }}>Ops Guide</a> walks through every page and tool in detail.
      </p>
    </section>
  );
}
