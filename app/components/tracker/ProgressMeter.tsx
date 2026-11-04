import { STATUS_LABEL, type TrackerCounts } from '@/app/lib/trackerLogic';
import { METER_ORDER, STATUS_STYLE } from './statusStyle';

// Segmented meter: done / in progress / to do / parked. The whole bar is one
// image with a text alternative giving every count; the optional legend repeats
// the counts in words, so nothing depends on seeing colour.

export default function ProgressMeter({
  counts,
  label,
  height = 14,
  legend = false,
}: {
  counts: TrackerCounts;
  /** What the meter measures, for the text alternative, e.g. "World of Contracts". */
  label: string;
  height?: number;
  legend?: boolean;
}) {
  const alt = `${label}: ` + METER_ORDER.map(s => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`).join(', ');
  return (
    <div>
      <div
        role="img"
        aria-label={alt}
        className="flex w-full overflow-hidden"
        style={{ height, gap: 2, borderRadius: height / 2, background: 'var(--panel-2)' }}
      >
        {counts.total === 0 ? null : METER_ORDER.map(s => {
          if (counts[s] === 0) return null;
          const hollow = s === 'todo';
          return (
            <span
              key={s}
              style={{
                flexGrow: counts[s],
                flexBasis: 0,
                minWidth: 4,
                background: STATUS_STYLE[s].segment,
                boxShadow: hollow ? `inset 0 0 0 1.5px ${STATUS_STYLE[s].color}` : undefined,
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      {legend && (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {METER_ORDER.map(s => (
            <li key={s} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg)' }}>
              <span
                aria-hidden="true"
                className="inline-block h-3 w-5 shrink-0 rounded-sm"
                style={{
                  background: STATUS_STYLE[s].segment,
                  boxShadow: s === 'todo' ? `inset 0 0 0 1.5px ${STATUS_STYLE[s].color}` : undefined,
                }}
              />
              <span className="mono-num font-semibold">{counts[s]}</span>
              <span style={{ color: 'var(--fg-2)' }}>{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
