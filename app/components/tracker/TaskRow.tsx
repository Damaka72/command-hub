'use client';

import {
  OWNER_LABEL, STATUSES, STATUS_HINT, STATUS_LABEL, advance,
  type TaskStatus, type TrackerTask,
} from '@/app/lib/trackerLogic';
import { STATUS_STYLE } from './statusStyle';

// One task: title and notes on the left, a pill-shaped status control on the
// right. The pill is a native <select> dressed as a pill, so the status is
// always written out in words, a phone opens its own picker, and a screen
// reader announces it. "Start / Mark done / Reopen / Unpark" under the title is
// the one-tap shortcut for the usual move.

export default function TaskRow({
  task,
  onStatus,
  areaLabel,
}: {
  task: TrackerTask;
  onStatus: (taskId: string, status: TaskStatus) => void;
  /** Shown above the title when the row appears outside its own area card. */
  areaLabel?: string;
}) {
  const style = STATUS_STYLE[task.status];
  const step = advance(task.status);

  return (
    <li
      className="flex items-start justify-between gap-3 px-4 py-3.5"
      style={{ borderTop: '1px solid var(--line)' }}
    >
      <div className="min-w-0 flex-1">
        {areaLabel && (
          <p className="mb-0.5 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>{areaLabel}</p>
        )}
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: task.status === 'done' ? 'var(--fg-2)' : 'var(--fg)',
            textDecoration: task.status === 'done' ? 'line-through' : undefined,
            textDecorationColor: 'var(--fg-3)',
          }}
        >
          {task.title}
        </p>
        {task.detail && (
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--fg-2)' }}>{task.detail}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-xs font-medium" style={{ color: 'var(--fg-2)' }}>{OWNER_LABEL[task.owner]}</span>
          {task.next && task.status !== 'done' && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-text)' }}
            >
              Next step
            </span>
          )}
          {task.when && <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{task.when}</span>}
          <button
            type="button"
            onClick={() => onStatus(task.id, step.to)}
            aria-label={`${step.label}: ${task.title}`}
            className="-my-1.5 min-h-9 rounded-full px-2 text-xs font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--accent-text)' }}
          >
            {step.label}
          </button>
        </div>
      </div>

      <label className="relative inline-flex shrink-0">
        <span className="sr-only">Status of “{task.title}”</span>
        <select
          value={task.status}
          onChange={e => onStatus(task.id, e.target.value as TaskStatus)}
          title={STATUS_HINT[task.status]}
          className="min-h-11 cursor-pointer appearance-none rounded-full py-2 pl-8 pr-7 text-sm font-semibold"
          style={{
            background: `color-mix(in srgb, ${style.color} 12%, var(--panel))`,
            color: style.color,
            border: `1.5px ${task.status === 'parked' ? 'dashed' : 'solid'} ${style.color}`,
            colorScheme: 'dark',
          }}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: style.color }}
        >
          {style.glyph}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: style.color }}
        >
          ▾
        </span>
      </label>
    </li>
  );
}
