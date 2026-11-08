import type { ReactNode } from 'react';

// The highlighted "Your next steps" panel. The caller supplies the rows, so the
// same panel serves one site (editable rows) and the home page (links to each
// site's tracker).

export default function NextStepsPanel({
  count,
  children,
  headingId,
  emptyText = 'Nothing flagged as a next step right now.',
}: {
  count: number;
  children: ReactNode;
  headingId: string;
  emptyText?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--accent) 7%, var(--panel))',
        border: '1.5px solid var(--accent-text)',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <h2 id={headingId} className="px-4 pb-3 pt-4 text-lg font-bold sm:px-5" style={{ color: 'var(--fg)' }}>
        Your next steps{' '}
        <span className="mono-num font-semibold" style={{ color: 'var(--accent-text)' }}>({count})</span>
      </h2>
      {count === 0 ? (
        <p className="px-4 pb-4 text-sm sm:px-5" style={{ color: 'var(--fg-2)' }}>{emptyText}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </section>
  );
}
