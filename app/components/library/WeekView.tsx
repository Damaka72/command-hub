'use client';

import { weekDates, weekdayShort, dayOfMonth } from '@/app/lib/weekDates';
import { siteColor } from '@/app/lib/siteColors';
import type { LibraryWeekRow } from '@/app/api/library/week/route';

// Seven equal columns, Monday-first (UX spec §4.2). Content is only ever
// generated Monday–Friday, so Saturday/Sunday always render the em-dash.

function hookPreview(row: LibraryWeekRow): string {
  const text = row.edited_content ?? row.content ?? '';
  return text.length > 90 ? text.slice(0, 90) + '…' : text;
}

export default function WeekView({
  week,
  rows,
  onOpenRow,
  filterLabel,
}: {
  week: string;
  rows: LibraryWeekRow[];
  onOpenRow: (row: LibraryWeekRow) => void;
  filterLabel: string;
}) {
  const dates = weekDates(week);
  const todayIso = new Date().toISOString().slice(0, 10);

  const byDate = new Map<string, LibraryWeekRow[]>();
  for (const row of rows) {
    const idx = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(row.day_name);
    if (idx === -1) continue;
    const date = dates[idx];
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(row);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-2">
        {dates.map(date => {
          const isToday = date === todayIso;
          const dayRows = byDate.get(date) ?? [];
          return (
            <div
              key={date}
              className="flex flex-col gap-2 rounded-xl p-2"
              style={{
                minHeight: 190,
                background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--panel)',
                border: isToday ? '1px solid #3b82f6' : '1px solid var(--line)',
              }}
            >
              <div className="flex items-baseline gap-1.5 px-1">
                <span className="mono-num text-lg font-semibold" style={{ color: isToday ? '#3b82f6' : 'var(--fg)' }}>
                  {String(dayOfMonth(date)).padStart(2, '0')}
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>
                  {weekdayShort(date)}
                </span>
              </div>

              {dayRows.length === 0 ? (
                <span className="px-1 text-sm" style={{ color: 'var(--fg-3)' }}>—</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {dayRows.map(row => {
                    const c = siteColor(row.site_id);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => onOpenRow(row)}
                        className="flex flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-transform hover:translate-x-0.5"
                        style={{ borderLeft: `2.5px solid ${c.accent}`, background: c.tint }}
                      >
                        <span className="mono-num text-[11px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
                          {c.key} · {row.platform}
                        </span>
                        <span className="text-xs leading-snug" style={{ color: 'var(--fg-2)' }}>
                          {hookPreview(row)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
        {rows.length} posts shown · {filterLabel} · click a card to open it in the library
      </p>
    </div>
  );
}
