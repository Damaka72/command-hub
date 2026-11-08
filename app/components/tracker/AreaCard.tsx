import type { ReactNode } from 'react';
import type { TrackerCounts } from '@/app/lib/trackerLogic';
import ThinBar from './ThinBar';

// One area of work: heading, "x of y done", a thin bar, then its task rows.
// A <details> element so long areas can be folded away; it works without script.

export default function AreaCard({
  name,
  counts,
  visible,
  open,
  children,
}: {
  name: string;
  counts: TrackerCounts;
  /** Tasks left after the filter; when the filter hides some, the heading says so. */
  visible: number;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      className="overflow-hidden"
      style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-card)' }}
    >
      <summary className="flex min-h-11 cursor-pointer flex-col gap-3 p-4 sm:p-5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-base font-bold" style={{ color: 'var(--fg)' }}>{name}</span>
          <span className="mono-num shrink-0 text-sm" style={{ color: 'var(--fg-2)' }}>
            {counts.done} of {counts.total} done
          </span>
        </span>
        <ThinBar done={counts.done} total={counts.total} label={name} />
        {visible < counts.total && (
          <span className="text-xs" style={{ color: 'var(--fg-2)' }}>
            Showing {visible} of {counts.total} tasks
          </span>
        )}
      </summary>
      <ul>{children}</ul>
    </details>
  );
}
