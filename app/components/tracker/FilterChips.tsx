'use client';

import { FILTERS, FILTER_LABEL, type TaskFilter } from '@/app/lib/trackerLogic';

// Everything / Needs you / Hide done. A toggle group of buttons (not colour-only:
// the chosen chip is also marked with a tick and aria-pressed).

export default function FilterChips({
  value,
  onChange,
  shown,
}: {
  value: TaskFilter;
  onChange: (f: TaskFilter) => void;
  /** How many tasks the current filter shows, announced politely. */
  shown: number;
}) {
  return (
    <div role="group" aria-label="Filter tasks" className="flex flex-wrap items-center gap-2">
      {FILTERS.map(f => {
        const on = f === value;
        return (
          <button
            key={f}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(f)}
            className="min-h-11 rounded-full px-4 text-sm font-semibold transition-colors"
            style={{
              background: on ? 'var(--accent-dim)' : 'var(--panel-2)',
              color: on ? 'var(--accent-text)' : 'var(--fg-2)',
              border: `1.5px solid ${on ? 'var(--accent-text)' : 'var(--line-2)'}`,
            }}
          >
            {on && <span aria-hidden="true">✓ </span>}
            {FILTER_LABEL[f]}
          </button>
        );
      })}
      <span role="status" className="mono-num text-sm" style={{ color: 'var(--fg-2)' }}>
        {shown} {shown === 1 ? 'task' : 'tasks'} shown
      </span>
    </div>
  );
}
