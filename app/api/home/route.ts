// ── Home page API ─────────────────────────────────────────────────────────────
// GET /api/home?week=YYYY-MM-DD — everything the redesigned home page needs in
// one call: the hero dial's aggregate pushed/planned, the stat rail (streak,
// planned, in review, next out, 8-week sparkline), and each site's mini
// metrics + this week's theme for the collapsible site panels.
//
// All values come from existing tables (content_library, weekly_plan) via the
// shared helpers in app/lib/contentLibraryStats.ts — no schema change, no new
// per-row-fetch (UX spec §7).

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PIPELINE_SITE_ORDER } from '@/app/lib/siteColors';
import { getWeekCounts, getPushedSparkline, computeStreak } from '@/app/lib/contentLibraryStats';
import { mondayOf } from '@/app/lib/weekDates';

export const dynamic = 'force-dynamic';

export interface HomeSiteStat {
  siteId:     string;
  planned:    number;
  pushed:     number;
  needsMedia: number;
  inReview:   number;
  pct:        number;
  nextOut:    string | null;
  theme:      string | null;
}

export interface HomeResponse {
  week:          string;
  aggregatePct:  number;
  plannedTotal:  number;
  pushedTotal:   number;
  streak:        number;
  inReviewTotal: number;
  nextOut:       string | null;
  sparkline:     { week: string; pushed: number }[];
  sites:         Record<string, HomeSiteStat>;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const week = new URL(request.url).searchParams.get('week') ?? mondayOf();

    const [counts, streak, sparkline, plan, futureRows] = await Promise.all([
      getWeekCounts(supabase, week, PIPELINE_SITE_ORDER),
      computeStreak(supabase, week, PIPELINE_SITE_ORDER),
      getPushedSparkline(supabase, week, PIPELINE_SITE_ORDER, 8),
      supabase.from('weekly_plan').select('sites').eq('week_commencing', week).maybeSingle(),
      supabase
        .from('content_library')
        .select('site_id, scheduled_for')
        .not('scheduled_for', 'is', null)
        .gt('scheduled_for', new Date().toISOString())
        .in('site_id', PIPELINE_SITE_ORDER)
        .order('scheduled_for', { ascending: true })
        .limit(200),
    ]);

    if (plan.error) throw plan.error;
    if (futureRows.error) throw futureRows.error;

    const planSites = (plan.data as { sites?: Record<string, { theme?: string }> } | null)?.sites ?? {};
    const nextOutBySite = new Map<string, string>();
    for (const row of (futureRows.data ?? []) as { site_id: string; scheduled_for: string }[]) {
      if (!nextOutBySite.has(row.site_id)) nextOutBySite.set(row.site_id, row.scheduled_for);
    }
    const nextOut = (futureRows.data as { scheduled_for: string }[] | null)?.[0]?.scheduled_for ?? null;

    const sites: Record<string, HomeSiteStat> = {};
    let plannedTotal = 0;
    let pushedTotal = 0;
    let inReviewTotal = 0;

    for (const row of counts) {
      const inReview = row.counts.draft + row.counts.approved + row.counts.approved_needs_media;
      plannedTotal += row.total;
      pushedTotal += row.counts.pushed;
      inReviewTotal += inReview;
      sites[row.siteId] = {
        siteId:     row.siteId,
        planned:    row.total,
        pushed:     row.counts.pushed,
        needsMedia: row.counts.approved_needs_media,
        inReview,
        pct:        row.total > 0 ? Math.round((row.counts.pushed / row.total) * 100) : 0,
        nextOut:    nextOutBySite.get(row.siteId) ?? null,
        theme:      planSites[row.siteId]?.theme ?? null,
      };
    }

    const response: HomeResponse = {
      week,
      aggregatePct: plannedTotal > 0 ? Math.round((pushedTotal / plannedTotal) * 100) : 0,
      plannedTotal,
      pushedTotal,
      streak,
      inReviewTotal,
      nextOut,
      sparkline,
      sites,
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load home data', detail: String(err) }, { status: 500 });
  }
}
