// ── Library month view API ────────────────────────────────────────────────────
// GET /api/library/month?month=YYYY-MM-01&site=<optional siteId>
//
// site_id + the row's calendar date only — no bodies (UX spec §7: "the view
// only needs dots"). content_library has no raw date column, only
// week_commencing (the Monday) + day_name, so the query pulls every week
// touching the visible 6-week grid and the date is derived client-side by
// the caller via dateForDayName.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PIPELINE_SITE_ORDER } from '@/app/lib/siteColors';
import { monthGrid, addDays } from '@/app/lib/weekDates';

export const dynamic = 'force-dynamic';

export interface LibraryMonthRow {
  site_id:         string;
  week_commencing: string;
  day_name:        string;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const site = url.searchParams.get('site');
    if (!month) return NextResponse.json({ error: 'month query param is required' }, { status: 400 });

    const grid = monthGrid(month);
    const gridStart = grid[0];
    const gridEnd = grid[grid.length - 1];
    // Widen by a week on each side so week_commencing rows whose weekdays fall
    // inside the grid but whose Monday sits just outside it aren't missed.
    const queryStart = addDays(gridStart, -7);

    const { data, error } = await supabase
      .from('content_library')
      .select('site_id, week_commencing, day_name')
      .gte('week_commencing', queryStart)
      .lte('week_commencing', gridEnd)
      .in('site_id', site ? [site] : PIPELINE_SITE_ORDER)
      .not('day_name', 'is', null);
    if (error) throw error;

    const rows = (data ?? []) as LibraryMonthRow[];
    return NextResponse.json({ month, gridStart, gridEnd, rows });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load month view', detail: String(err) }, { status: 500 });
  }
}
