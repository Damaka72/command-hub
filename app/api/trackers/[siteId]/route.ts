// ── Site work tracker — one site ─────────────────────────────────────────────
//   GET   /api/trackers/<siteId>   the site's tasks with saved statuses applied
//   PATCH /api/trackers/<siteId>   { taskId, status }  move one task on
// Auth is enforced app-wide by the root proxy.ts — no per-route check here.

import { NextResponse } from 'next/server';
import { loadTracker, loadTrackerFile, saveTaskStatus, type Persistence } from '@/app/lib/trackerStore';
import { isStatus, type TrackerSite } from '@/app/lib/trackerLogic';

export const dynamic = 'force-dynamic';

export interface TrackerResponse {
  site:        TrackerSite | null;
  persistence: Persistence;
  error?:      string;
}

type Ctx = { params: Promise<{ siteId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  try {
    const found = await loadTracker(siteId);
    if (!found) {
      return NextResponse.json(
        { site: null, persistence: 'unavailable', error: 'No tracker for that site' } satisfies TrackerResponse,
        { status: 404 },
      );
    }
    return NextResponse.json(found satisfies TrackerResponse, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json(
      { site: null, persistence: 'unavailable', error: String(e) } satisfies TrackerResponse,
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  let body: { taskId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const file = loadTrackerFile(siteId);
  if (!file) return NextResponse.json({ error: 'No tracker for that site' }, { status: 404 });
  if (typeof body.taskId !== 'string' || !file.tasks.some(t => t.id === body.taskId)) {
    return NextResponse.json({ error: 'Unknown taskId' }, { status: 400 });
  }
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: 'status must be todo, in_progress, done or parked' }, { status: 400 });
  }

  const saved = await saveTaskStatus(siteId, body.taskId, body.status);
  if (!saved) {
    return NextResponse.json({ saved: false, error: 'Could not store the change' }, { status: 503 });
  }
  return NextResponse.json({ saved: true });
}
