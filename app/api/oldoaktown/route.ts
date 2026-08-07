// ── Old Oak Town admin notifications ─────────────────────────────────────────
// GET /api/oldoaktown — pending businesses/events awaiting approval on
// oldoaktown.co.uk's own admin dashboard, plus how many approved businesses
// haven't been promoted to a social/newsletter spotlight yet. Read-only: this
// route never approves, rejects, or promotes anything by itself. See
// app/lib/oldoaktown.ts for how each source is reached, and POST
// /api/oldoaktown/promote for the promotion step.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { fetchPendingBusinesses, fetchPendingEvents, fetchApprovedBusinesses } from '@/app/lib/oldoaktown';

export const dynamic = 'force-dynamic';

export interface OldOakTownStatus {
  businesses: {
    pending: { id: string; name: string; tier: string; status: string; createdAt: string }[] | null;
  };
  events: {
    pending: { id: string; title: string; eventDate: string | null; source: string | null }[] | null;
  };
  readyToPromote: number; // approved businesses not yet in oldoaktown_business_promotions
}

export async function GET() {
  try {
    const [pendingBusinesses, pendingEvents, approvedBusinesses] = await Promise.all([
      fetchPendingBusinesses(),
      fetchPendingEvents(),
      fetchApprovedBusinesses(),
    ]);

    let readyToPromote = 0;
    if (approvedBusinesses && approvedBusinesses.length > 0) {
      const supabase = getSupabase();
      const { data: promoted } = await supabase
        .from('oldoaktown_business_promotions')
        .select('business_id')
        .in('business_id', approvedBusinesses.map(b => b.id));
      const promotedIds = new Set((promoted ?? []).map(r => r.business_id as string));
      readyToPromote = approvedBusinesses.filter(b => !promotedIds.has(b.id)).length;
    }

    const body: OldOakTownStatus = {
      businesses: {
        pending: pendingBusinesses?.map(b => ({
          id:        b.id,
          name:      b.business_name,
          tier:      b.tier,
          status:    b.status,
          createdAt: b.created_at,
        })) ?? null,
      },
      events: {
        pending: pendingEvents?.map(e => ({
          id:        e.id,
          title:     e.title,
          eventDate: e.event_date,
          source:    e.source,
        })) ?? null,
      },
      readyToPromote,
    };

    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: 'Could not load Old Oak Town admin status', detail: String(err) }, { status: 500 });
  }
}
