'use client';

import { monthGrid, dayOfMonth, mondayOf as computeMonday, dateForDayName } from '@/app/lib/weekDates';
import { siteColor } from '@/app/lib/siteColors';
import type { LibraryMonthRow } from '@/app/api/library/month/route';

// Seven-column grid, Monday-first, leading/trailing days at 32% opacity (UX
// spec §4.3) — answers "am I actually balanced across sites this month" in
// one glance via dot density and colour mix, capped at 10 dots per cell.

const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MAX_DOTS = 10;

// Monday (YYYY-MM-DD) of the week containing `date`.
function mondayOfDate(date: string): string {
  return computeMonday(new Date(`${date}T00:00:00Z`));
}

export default function MonthView({
  month,
  rows,
  onCellClick,
}: {
  month: string;
  rows: LibraryMonthRow[];
  onCellClick: (weekMonday: string) => void;
}) {
  const grid = monthGrid(month);
  const monthIndex = new Date(`${month}T00:00:00Z`).getUTCMonth();
  const todayIso = new Date().toISOString().slice(0, 10);

  const bySites = new Map<string, string[]>(); // date -> site_ids
  for (const row of rows) {
    const date = dateForDayName(row.week_commencing, row.day_name);
    if (!date) continue;
    if (!bySites.has(date)) bySites.set(date, []);
    bySites.get(date)!.push(row.site_id);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_HEADERS.map(w => (
          <div key={w} className="px-1 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map(date => {
          const inMonth = new Date(`${date}T00:00:00Z`).getUTCMonth() === monthIndex;
          const isToday = date === todayIso;
          const sites = bySites.get(date) ?? [];
          const shown = sites.slice(0, MAX_DOTS);
          const overflow = sites.length - shown.length;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onCellClick(mondayOfDate(date))}
              className="flex flex-col items-start gap-1 rounded-lg p-1.5 text-left transition-colors hover:brightness-125"
              style={{
                height: 88,
                opacity: inMonth ? 1 : 0.32,
                background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--panel)',
                border: isToday ? '1px solid #3b82f6' : '1px solid var(--line)',
              }}
            >
              <span className="mono-num text-xs" style={{ color: isToday ? '#3b82f6' : 'var(--fg-2)' }}>
                {dayOfMonth(date)}
              </span>
              <div className="flex flex-wrap gap-1">
                {shown.map((siteId, i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{ width: 6, height: 6, background: siteColor(siteId).accent }}
                  />
                ))}
              </div>
              {overflow > 0 && (
                <span className="mono-num text-[10px]" style={{ color: 'var(--fg-3)' }}>+{overflow}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
