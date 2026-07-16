// ── Actions log API ───────────────────────────────────────────────────────────
// GET /api/actions[?status=open|done|in_progress|blocked][&limit=N]
//   Reads the central `actions_log` table in Supabase — the single live source of
//   truth that replaces the old localStorage-based Command Hub tracker. Rows are
//   written by Cowork sessions, the coordinator agent, and manual entries.
//
//   status=open   → in_progress + blocked (what still needs attention)
//   status=done   → completed actions (the "what has happened" activity feed)
//   omitted       → everything, newest first
//
// Auth is enforced app-wide by the root proxy.ts (hub_auth boundary) — no
// per-route check here.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export type ActionStatus = 'done' | 'in_progress' | 'blocked';
export type ActionSource = 'cowork_session' | 'manual' | 'coordinator_agent';

export interface ActionLogEntry {
  id: string;
  siteId: string | null;   // one of the five sites, or null for cross-site/general
  channel: string | null;  // e.g. skool, newsletter, social, blog, consulting
  action: string;
  status: ActionStatus;
  source: ActionSource;
  link: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ActionsResponse {
  actions: ActionLogEntry[];
}

interface ActionRow {
  id: string;
  site_id: string | null;
  channel: string | null;
  action: string;
  status: string;
  source: string;
  link: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200);

    let query = supabase
      .from('actions_log')
      .select('id, site_id, channel, action, status, source, link, completed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status === 'open') {
      query = query.in('status', ['in_progress', 'blocked']);
    } else if (status === 'done' || status === 'in_progress' || status === 'blocked') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { actions: [], error: error.message } satisfies ActionsResponse & { error: string },
        { status: 500 },
      );
    }

    const actions: ActionLogEntry[] = ((data as ActionRow[]) ?? []).map(r => ({
      id: r.id,
      siteId: r.site_id,
      channel: r.channel,
      action: r.action,
      status: r.status as ActionStatus,
      source: r.source as ActionSource,
      link: r.link,
      completedAt: r.completed_at,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ actions } satisfies ActionsResponse, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      { actions: [], error: String(e) } satisfies ActionsResponse & { error: string },
      { status: 500 },
    );
  }
}
