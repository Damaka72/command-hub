import { alpha } from '@/app/lib/siteColors';

// Semantic status pill (UX spec §2.2) — pushed/published = --ok, needs
// media/awaiting action = --warn, draft/idle = --idle. Every status also
// carries a text label, never colour alone (UX spec §9).

export type Semantic = 'ok' | 'warn' | 'idle';

const COLOR: Record<Semantic, string> = {
  ok:   'var(--ok)',
  warn: 'var(--warn)',
  idle: 'var(--idle)',
};

export default function StatusPill({
  tone,
  label,
  tint,
}: {
  tone:  Semantic;
  label: string;
  /** Override the pill background/border with a site tint instead of the semantic wash (e.g. "N in review" in site colour). */
  tint?: { accent: string; tint: string };
}) {
  const color = tint ? tint.accent : COLOR[tone];
  const bg    = tint ? tint.tint   : alpha(COLOR[tone], 16);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-medium"
      style={{ background: bg, color, border: `1px solid ${alpha(color, 25)}` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
