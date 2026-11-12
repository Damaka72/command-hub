// ── Command Hub home: the morning paper ──────────────────────────────────────
// Didi's AI OS front page, read top to bottom every morning:
//   Faith → Health check → Today → Overnight → Insights
// Each section is its own component that loads its own data, so one slow or
// failing source never blanks the page. To add a section: build a component in
// app/components/hub/, then add it to SECTIONS below (and to JUMP in
// FaithHeader.tsx if it should get a jump link). See data/hub/README.md.
//
// The operations dashboard (revenue, deploys, trackers, per-site panels)
// lives at /ops.

import type { ComponentType } from 'react';
import FaithHeader from './components/hub/FaithHeader';
import HealthCheck from './components/hub/HealthCheck';
import TodaySection from './components/hub/TodaySection';
import OvernightSection from './components/hub/OvernightSection';
import InsightsSection from './components/hub/InsightsSection';
import { display } from './components/hub/ui';

const SECTIONS: { id: string; Component: ComponentType }[] = [
  { id: 'health', Component: HealthCheck },
  { id: 'today', Component: TodaySection },
  { id: 'overnight', Component: OvernightSection },
  { id: 'insights', Component: InsightsSection },
];

export default function Home() {
  return (
    <div className={`news-paper ${display.variable} min-h-screen`}>
      <FaithHeader />
      <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        {SECTIONS.map(({ id, Component }) => <Component key={id} />)}
      </main>
      <footer className="border-t border-news-rule py-5 text-center text-xs text-news-ink-3">
        Command Hub · Didi Anolue
      </footer>
    </div>
  );
}
