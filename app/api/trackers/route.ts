// ── Site work trackers — roll-up ─────────────────────────────────────────────
//   GET /api/trackers   one summary per tracked site (percentage done, counts,
//                       number of open next steps), for the home-page roll-up.
// Auth is enforced app-wide by the root proxy.ts — no per-route check here.

import { NextResponse } from 'next/server';
import { loadAllTrackers, type Persistence } from '@/app/lib/trackerStore';
import { summarise, type TrackerSummary } from '@/app/lib/trackerLogic';
import { loadAllChecklists } from '@/app/lib/checklistStore';
import { summarise as summariseChecklist, type ChecklistSummary } from '@/app/lib/checklistLogic';

export const dynamic = 'force-dynamic';

export interface TrackersResponse {
  trackers:    TrackerSummary[];
  /** Launch checklists, one per site that has a file in data/checklists/ (progress line on the site card). */
  checklists?: ChecklistSummary[];
  persistence: Persistence;
  error?:      string;
}

export async function GET() {
  try {
    const { sites, persistence } = await loadAllTrackers();
    const lists = await loadAllChecklists().catch(() => ({ files: [] }));
    return NextResponse.json(
      { trackers: sites.map(summarise), checklists: lists.files.map(summariseChecklist), persistence } satisfies TrackersResponse,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return NextResponse.json(
      { trackers: [], persistence: 'unavailable', error: String(e) } satisfies TrackersResponse,
      { status: 500 },
    );
  }
}
