// A thin progress bar: the filled part is "done". It is a plain graphic with a
// text alternative; the count beside it in the card says the same in words.

export default function ThinBar({
  done,
  total,
  label,
  height = 6,
}: {
  done: number;
  total: number;
  /** What it measures, e.g. "On the website". */
  label: string;
  height?: number;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      role="progressbar"
      aria-label={`${label}: ${done} of ${total} done`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="w-full overflow-hidden"
      style={{ height, borderRadius: height, background: 'var(--panel-3)' }}
    >
      <div style={{ width: `${pct}%`, height: '100%', borderRadius: height, background: 'var(--ok)' }} />
    </div>
  );
}
