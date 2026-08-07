// ── Old Oak Town approval webhook ────────────────────────────────────────────
// POST /api/oldoaktown/webhook  { businessId?: string }
// Header: x-webhook-secret: <OLDOAKTOWN_WEBHOOK_SECRET>
//
// Fired by oldoaktown's own api/approve.js the instant a business is approved
// there (both the admin-dashboard "Approve" button and the email approve
// link), so a spotlight draft is created within seconds instead of waiting
// for someone to click "Promote new businesses" in the Hub. Delegates to the
// same app/lib/oldoaktown-promote.ts logic that button uses.
//
// This is a server-to-server call from a different Vercel project, so it
// can't carry the Hub's hub_auth browser cookie. proxy.ts explicitly exempts
// this one path from the cookie gate and this handler checks the shared
// secret itself instead — see the PUBLIC_PATHS comment in proxy.ts. There is
// no other route where this pattern should be copied.

import { NextResponse } from 'next/server';
import { promoteOldOakTownBusinesses } from '@/app/lib/oldoaktown-promote';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const configuredSecret = process.env.OLDOAKTOWN_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: 'Webhook not configured — set OLDOAKTOWN_WEBHOOK_SECRET' }, { status: 503 });
  }
  if (request.headers.get('x-webhook-secret') !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const businessId: string | undefined = typeof body?.businessId === 'string' ? body.businessId : undefined;

    const result = await promoteOldOakTownBusinesses(businessId ? [businessId] : undefined);
    if (!Array.isArray(result)) {
      return NextResponse.json({ error: result.configError }, { status: 502 });
    }
    return NextResponse.json({ ok: true, promoted: result });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook handling failed', detail: String(err) }, { status: 500 });
  }
}
