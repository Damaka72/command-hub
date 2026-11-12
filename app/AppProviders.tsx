'use client';

import { WeekProvider } from './context/WeekContext';
import { SiteFilterProvider } from './context/SiteFilterContext';
import CommandPalette from './components/CommandPalette';
import ScrollToTop from './components/ScrollToTop';

// Lifts week-commencing + the selected site filter to the app layout level
// (UX spec §5) so every page shares one source of truth, and mounts the
// global command palette (UX spec §6) and the Back to top button.

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WeekProvider>
      <SiteFilterProvider>
        {children}
        <CommandPalette />
        <ScrollToTop />
      </SiteFilterProvider>
    </WeekProvider>
  );
}
