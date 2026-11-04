'use client';

import {
  OWNER_LABEL, STATUSES, STATUS_HINT, STATUS_LABEL, advance,
  type TaskStatus, type TrackerTask,
} from '@/app/lib/trackerLogic';
import { STATUS_STYLE } from './statusStyle';

// One task. The status is shown as a word (and glyph) inside a native <select>,
// so it can be moved on with one tap on a phone and read out by a screen reader.
// "Start / Mark done / Reopen / Unpark" is the one-tap shortcut for the usual move.

export default function TaskRow({
  task,
  onStatus,
}: {
  task: TrackerTask;
  onStatus: (taskId: string, status: TaskStatus) => void;
}) {
  const style = STATUS_STYLE[task.status];
  const step = advance(task.status);

  return (
    <li
      className="flex flex-col gap-2 rounded-lg p-3"
      style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}
    >
      <div>
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
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{ background: 'var(--hub-surface-3)', color: 'var(--fg)', border: '1px solid var(--line-2)' }}
        >
          {OWNER_LABEL[task.owner]}
        </span>
        {task.next && task.status !== 'done' && (
          <span
            className="rounded px-1.5 py-0.5 text-xs font-semibold"
            style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--hub-accent-text)' }}
          >
            Next step
          </span>
        )}
        {task.when && (
          <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{task.when}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative inline-flex">
          <span className="sr-only">Status of “{task.title}”</span>
          <select
            value={task.status}
            onChange={e => onStatus(task.id, e.target.value as TaskStatus)}
            title={STATUS_HINT[task.status]}
            className="min-h-11 cursor-pointer appearance-none rounded-lg py-2 pl-8 pr-8 text-sm font-semibold"
            style={{
              background: 'var(--panel)',
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
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm"
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

        <button
          type="button"
          onClick={() => onStatus(task.id, step.to)}
          aria-label={`${step.label}: ${task.title}`}
          className="min-h-11 rounded-lg px-3.5 text-sm font-semibold transition-all hover:brightness-125"
          style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--hub-accent-text)' }}
        >
          {step.label}
        </button>
      </div>
    </li>
  );
}
