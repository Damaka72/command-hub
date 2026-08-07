// ── Promote newly-approved Old Oak Town businesses (manual trigger) ─────────
// POST /api/oldoaktown/promote  { businessIds?: string[] }
//
// The button-driven entry point to app/lib/oldoaktown-promote.ts — see that
// file for what this actually does. Gated behind the Hub's normal hub_auth
// cookie (enforced by proxy.ts), same as every other dashboard action.
//
// The event-driven entry point is POST /api/oldoaktown/webhook, fired by
// oldoaktown's own api/approve.js the moment a business is approved there.

import { NextResponse } from 'next/server';
import { promoteOldOakTownBusinesses } from '@/app/lib/oldoaktown-promote';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedIds: string[] | undefined = Array.isArray(body?.businessIds) ? body.businessIds : undefined;

    const result = await promoteOldOakTownBusinesses(requestedIds);
    if (!Array.isArray(result)) {
      return NextResponse.json({ error: result.configError }, { status: 502 });
    }
    if (result.length === 0) {
      return NextResponse.json({ ok: true, promoted: [], message: 'Nothing new to promote' });
    }
    return NextResponse.json({ ok: true, promoted: result });
  } catch (err) {
    return NextResponse.json({ error: 'Could not run promotion', detail: String(err) }, { status: 500 });
  }
}
