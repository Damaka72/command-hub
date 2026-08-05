// ── Library week view API ─────────────────────────────────────────────────────
// GET /api/library/week?week=YYYY-MM-DD&site=<optional siteId>
//
// Rows for the seven dates in the given week (UX spec §4.2, §7). Content is
// only ever generated Monday–Friday, so Saturday/Sunday are always empty —
// the week view renders those as an em-dash rather than fetching anything for
// them. Ordered by scheduled_for (nulls last, i.e. not-yet-scheduled first
// within a day) so pushed rows show in their actual posting order.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PIPELINE_SITE_ORDER } from '@/app/lib/siteColors';

export const dynamic = 'force-dynamic';

export interface LibraryWeekRow {
  id:              string;
  site_id:         string;
  week_commencing: string;
  day_name:        string;
  platform:        string;
  status:          string;
  content:         string | null;
  edited_content:  string | null;
  scheduled_for:   string | null;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const week = url.searchParams.get('week');
    const site = url.searchParams.get('site');
    if (!week) return NextResponse.json({ error: 'week query param is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('content_library')
      .select('id, site_id, week_commencing, day_name, platform, status, content, edited_content, scheduled_for')
      .eq('week_commencing', week)
      .in('site_id', site ? [site] : PIPELINE_SITE_ORDER)
      .order('scheduled_for', { ascending: true, nullsFirst: true });
    if (error) throw error;

    return NextResponse.json({ week, rows: (data ?? []) as LibraryWeekRow[] });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load week view', detail: String(err) }, { status: 500 });
  }
}
