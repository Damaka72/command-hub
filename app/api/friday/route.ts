// ── Friday API ────────────────────────────────────────────────────────────────
// GET  /api/friday?week=YYYY-MM-DD — end-of-week aggregate for the Friday report:
//        planned          : per-site content_library counts by status
//        newsletters      : each publication's status for the week (or null)
//        gumroad          : { thisWeek, lastWeek } revenue (£), bucketed by sale date
//        subscriberCounts : recent subscriber_counts rows (for the WoW table)
// POST /api/friday — log one publication's subscriber count for a week; upserts on
//        (publication, week_commencing) matching the unique constraint.
//
// Same shape/conventions as app/api/newsletters/route.ts. Auth is enforced
// app-wide by the root proxy.ts (the hub_auth boundary) — no per-route check.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PUBLICATIONS, PUBLICATION_SLUGS } from '@/app/lib/siteConstants';

export const dynamic = 'force-dynamic';

// The four pipeline sites that produce content_library rows (didianolue is
// handled personally and has no pipeline).
const SITE_ORDER = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];

const STATUS_KEYS = ['draft', 'approved', 'approved_needs_media', 'rejected', 'pushed', 'failed'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

function emptyCounts(): Record<StatusKey, number> {
  return { draft: 0, approved: 0, approved_needs_media: 0, rejected: 0, pushed: 0, failed: 0 };
}

// Add `days` to a YYYY-MM-DD date, returning YYYY-MM-DD (UTC-safe).
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Gumroad revenue (£) for the selected week and the week before, bucketed by the
// sale's own timestamp. Reuses the dashboard's Gumroad wiring (GUMROAD_ACCESS,
// api.gumroad.com/v2/sales). Returns nulls if the key is missing or the API fails
// — the same graceful degradation the dashboard uses.
async function fetchGumroadWeeks(week: string): Promise<{ thisWeek: number | null; lastWeek: number | null }> {
  const apiKey = process.env.GUMROAD_ACCESS;
  if (!apiKey) return { thisWeek: null, lastWeek: null };

  const lastWeekStart = addDays(week, -7); // fetch everything from last Monday on
  const thisWeekStart = new Date(`${week}T00:00:00Z`).getTime();
  const thisWeekEnd   = new Date(`${addDays(week, 7)}T00:00:00Z`).getTime();
  const lastWeekStartMs = new Date(`${lastWeekStart}T00:00:00Z`).getTime();

  try {
    const res = await fetch(
      `https://api.gumroad.com/v2/sales?after=${encodeURIComponent(lastWeekStart)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return { thisWeek: null, lastWeek: null };
    const data = await res.json() as {
      success: boolean;
      sales?: Array<{ price: number; created_at?: string; sale_timestamp?: string }>;
    };
    if (!data.success || !Array.isArray(data.sales)) return { thisWeek: null, lastWeek: null };

    let thisCents = 0;
    let lastCents = 0;
    for (const sale of data.sales) {
      const stamp = sale.created_at ?? sale.sale_timestamp;
      if (!stamp) continue;
      const t = new Date(stamp).getTime();
      if (Number.isNaN(t)) continue;
      if (t >= thisWeekStart && t < thisWeekEnd) thisCents += sale.price ?? 0;
      else if (t >= lastWeekStartMs && t < thisWeekStart) lastCents += sale.price ?? 0;
    }
    return { thisWeek: Math.round(thisCents / 100), lastWeek: Math.round(lastCents / 100) };
  } catch {
    return { thisWeek: null, lastWeek: null };
  }
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const week = new URL(request.url).searchParams.get('week');
    if (!week) {
      return NextResponse.json({ error: 'week query param is required' }, { status: 400 });
    }

    const [library, newsletters, subscribers, gumroad] = await Promise.all([
      supabase
        .from('content_library')
        .select('site_id, status')
        .eq('week_commencing', week)
        .in('site_id', SITE_ORDER),
      supabase
        .from('newsletters')
        .select('publication, status')
        .eq('week_commencing', week),
      // Recent rows (this week + prior weeks) for the week-over-week table.
      supabase
        .from('subscriber_counts')
        .select('publication, week_commencing, subscriber_count')
        .order('week_commencing', { ascending: false })
        .limit(60),
      fetchGumroadWeeks(week),
    ]);

    if (library.error) throw library.error;
    if (newsletters.error) throw newsletters.error;
    if (subscribers.error) throw subscribers.error;

    // Planned vs published: per-site status counts.
    const countsBySite: Record<string, Record<StatusKey, number>> = {};
    for (const siteId of SITE_ORDER) countsBySite[siteId] = emptyCounts();
    for (const row of (library.data ?? []) as { site_id: string; status: string }[]) {
      const counts = countsBySite[row.site_id];
      if (counts && (STATUS_KEYS as readonly string[]).includes(row.status)) {
        counts[row.status as StatusKey]++;
      }
    }
    const planned = SITE_ORDER.map(siteId => {
      const counts = countsBySite[siteId];
      const total = STATUS_KEYS.reduce((sum, k) => sum + counts[k], 0);
      return { siteId, counts, total };
    });

    // Newsletter status per publication (null if no row yet).
    const nlRows = (newsletters.data ?? []) as { publication: string; status: string }[];
    const newsletterStatuses = PUBLICATIONS.map(p => ({
      slug:   p.slug,
      title:  p.title,
      status: nlRows.find(n => n.publication === p.slug)?.status ?? null,
    }));

    return NextResponse.json({
      week,
      planned,
      newsletters:      newsletterStatuses,
      gumroad,
      subscriberCounts: subscribers.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load Friday report', detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publication: string = body.publication;
    const week: string        = body.week;
    const rawCount            = body.subscriberCount;

    if (!PUBLICATION_SLUGS.includes(publication as never)) {
      return NextResponse.json({ error: 'valid publication is required' }, { status: 400 });
    }
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });

    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 0) {
      return NextResponse.json({ error: 'subscriberCount must be a non-negative number' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('subscriber_counts')
      .upsert(
        {
          publication,
          week_commencing:  week,
          subscriber_count: Math.round(count),
          entered_at:       new Date().toISOString(),
        },
        { onConflict: 'publication,week_commencing' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, entry: data });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save subscriber count', detail: String(err) }, { status: 500 });
  }
}
