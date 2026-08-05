'use client';

import ProgressRing from './ui/ProgressRing';

// Aggregate pushed ÷ planned across all pipeline sites for the current week
// (UX spec §3.1). The blue→purple gradient stroke and the mount animation are
// the one deliberate flourish on the page — it's what makes the home page
// feel alive on open.

export default function HeroDial({ pct }: { pct: number }) {
  return (
    <ProgressRing
      size={150}
      strokeWidth={12}
      pct={pct}
      label="Pushed this week"
      gradient
      centerText
      subLabel="PUSHED"
      animate
    />
  );
}
