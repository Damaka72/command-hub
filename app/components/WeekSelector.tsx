'use client';

import { useWeek } from '../context/WeekContext';
import { addWeeks, formatWeekChip, mondayOf } from '../lib/weekDates';

// One WeekSelector used on every week-scoped page (UX spec §5): ‹ W/C 03 AUG
// 2026 › plus a Today reset. Navigating Plan → Review → Friday keeps the same
// week — no re-picking.

export default function WeekSelector() {
  const { week, setWeek } = useWeek();
  const isCurrentWeek = week === mondayOf();

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Week navigation">
      <button
        type="button"
        onClick={() => setWeek(addWeeks(week, -1))}
        aria-label="Previous week"
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all hover:brightness-125"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}
      >
        ‹
      </button>
      <span
        className="mono-num rounded-md px-3 py-1.5 text-xs font-medium"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
      >
        {formatWeekChip(week)}
      </span>
      <button
        type="button"
        onClick={() => setWeek(addWeeks(week, 1))}
        aria-label="Next week"
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all hover:brightness-125"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}
      >
        ›
      </button>
      {!isCurrentWeek && (
        <button
          type="button"
          onClick={() => setWeek(mondayOf())}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:brightness-125"
          style={{ background: 'var(--hub-accent-dim)', color: '#a5b4fc', border: '1px solid var(--line-2)' }}
        >
          Today
        </button>
      )}
    </div>
  );
}
