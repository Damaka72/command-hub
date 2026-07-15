// ── Weekly Plan API ───────────────────────────────────────────────────────────
// GET  /api/plan[?week=YYYY-MM-DD] — the plan for that week (or the latest plan
//      as a template), the available pillars, and any research briefs for the week.
// POST /api/plan — upserts the weekly plan into Supabase, keyed on week_commencing.
//
// The source of truth is the Supabase `weekly_plan` table. The old fs-backed
// content-coordinator.json is kept only as an offline pipeline fallback.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import pillarsData from '@/data/content-pillars.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const week = new URL(request.url).searchParams.get('week'); // YYYY-MM-DD, optional

    // The plan for the requested week if one exists, otherwise the latest plan
    // (used as a starting template when planning a fresh week).
    let planRow: Record<string, unknown> | null = null;
    if (week) {
      const { data } = await supabase
        .from('weekly_plan').select('*').eq('week_commencing', week).maybeSingle();
      planRow = data as Record<string, unknown> | null;
    }
    if (!planRow) {
      const { data } = await supabase
        .from('weekly_plan').select('*')
        .order('week_commencing', { ascending: false }).limit(1).maybeSingle();
      planRow = data as Record<string, unknown> | null;
    }

    const coordinator = planRow
      ? {
          weekCommencing:    planRow.week_commencing,
          campaignObjective: planRow.campaign_objective ?? null,
          setAt:             planRow.set_at,
          sites:             planRow.sites ?? {},
        }
      : { weekCommencing: week ?? '', campaignObjective: null, setAt: null, sites: {} };

    // Research briefs for the selected week, keyed by siteId (read-only in the UI).
    const briefs: Record<string, string> = {};
    if (week) {
      const { data } = await supabase
        .from('research_briefs').select('site_id, brief').eq('week_commencing', week);
      for (const r of (data ?? []) as { site_id: string; brief: string }[]) {
        briefs[r.site_id] = r.brief;
      }
    }

    return NextResponse.json({ coordinator, pillars: pillarsData, briefs });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not read plan data', detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.weekCommencing || !body.sites || typeof body.sites !== 'object') {
      return NextResponse.json(
        { error: 'Invalid plan data — weekCommencing and sites are required' },
        { status: 400 },
      );
    }

    const setAt = new Date().toISOString();
    const supabase = getSupabase();
    const { error } = await supabase.from('weekly_plan').upsert(
      {
        week_commencing:    body.weekCommencing,
        campaign_objective: body.campaignObjective ?? null,
        set_at:             setAt,
        sites:              body.sites,
      },
      { onConflict: 'week_commencing' },
    );
    if (error) throw error;

    return NextResponse.json({
      success: true,
      coordinator: {
        weekCommencing:    body.weekCommencing,
        campaignObjective: body.campaignObjective ?? null,
        setAt,
        sites:             body.sites,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not save plan', detail: String(err) },
      { status: 500 },
    );
  }
}
