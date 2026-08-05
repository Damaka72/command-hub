'use client';

import { WeekProvider } from './context/WeekContext';
import { SiteFilterProvider } from './context/SiteFilterContext';
import CommandPalette from './components/CommandPalette';

// Lifts week-commencing + the selected site filter to the app layout level
// (UX spec §5) so every page shares one source of truth, and mounts the
// global command palette (UX spec §6).

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WeekProvider>
      <SiteFilterProvider>
        {children}
        <CommandPalette />
      </SiteFilterProvider>
    </WeekProvider>
  );
}
