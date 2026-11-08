import { percentDone, type TrackerCounts } from '@/app/lib/trackerLogic';
import ProgressMeter from './ProgressMeter';

// The band at the top of a page: a big percentage, a segmented meter and a
// legend. Parked work is counted in the percentage but called out separately,
// so nobody mistakes "deliberately waiting" for "forgotten".

export default function SummaryBand({
  counts,
  label,
  noun = 'tasks',
  headingId,
  heading,
}: {
  counts: TrackerCounts;
  /** Names the meter for screen readers, e.g. "World of Contracts". */
  label: string;
  /** What is being counted: "tasks" on a tracker, "tasks across all sites" on the home page. */
  noun?: string;
  headingId: string;
  heading: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="p-5 sm:p-6"
      style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-card)' }}
    >
      <h2 id={headingId} className="sr-only">{heading}</h2>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="mono-num text-5xl font-semibold leading-none sm:text-6xl" style={{ color: 'var(--fg)' }}>
          {percentDone(counts)}%
        </span>
        <span className="text-sm" style={{ color: 'var(--fg-2)' }}>
          done · {counts.done} of {counts.total} {noun}
        </span>
      </div>
      <ProgressMeter counts={counts} label={label} height={16} legend />
      {counts.parked > 0 && (
        <p className="mt-4 text-sm" style={{ color: 'var(--fg-2)' }}>
          <strong className="mono-num" style={{ color: 'var(--fg)' }}>{counts.parked} parked</strong>{' '}
          on purpose, not started yet. They still count towards the total.
        </p>
      )}
    </section>
  );
}
