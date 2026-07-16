// ── Actions log API ───────────────────────────────────────────────────────────
// The central `actions_log` table in Supabase — the single live source of truth
// that replaces the old localStorage-based Command Hub tracker. Rows are written
// by Cowork sessions, the coordinator agent, and manual dashboard entries, so the
// Today's Focus panel and the per-site / sidebar task widgets stay in sync.
//
//   GET    /api/actions[?status=open|done|in_progress|blocked][&site=<id>][&limit=N]
//            status=open → in_progress + blocked (what still needs attention)
//            status=done → completed actions (the "what has happened" feed)
//            omitted     → everything, newest first
//   POST   /api/actions            { siteId?, action, status?, channel?, source?, link? }
//            add a task/action (defaults: status in_progress, source manual)
//   PATCH  /api/actions            { id, status?, action? }
//            toggle/update; status → done stamps completed_at, otherwise clears it
//   DELETE /api/actions?id=<id>    remove a row
//
// Auth is enforced app-wide by the root proxy.ts (hub_auth boundary) — no
// per-route check here.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

export type ActionStatus = 'done' | 'in_progress' | 'blocked';
export type ActionSource = 'cowork_session' | 'manual' | 'coordinator_agent';

const STATUSES: ActionStatus[] = ['done', 'in_progress', 'blocked'];
const SOURCES: ActionSource[] = ['cowork_session', 'manual', 'coordinator_agent'];
const SITE_IDS = [
  'aiviralvideoprompts', 'didianolue', 'masteryourcareerpath',
  'oldoaktown', 'theconcurrentcontractor',
];

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

const SELECT_COLS = 'id, site_id, channel, action, status, source, link, completed_at, created_at';

function mapRow(r: ActionRow): ActionLogEntry {
  return {
    id: r.id,
    siteId: r.site_id,
    channel: r.channel,
    action: r.action,
    status: r.status as ActionStatus,
    source: r.source as ActionSource,
    link: r.link,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const site = searchParams.get('site');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200);

    let query = supabase
      .from('actions_log')
      .select(SELECT_COLS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (site) query = query.eq('site_id', site);

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

    const actions = ((data as ActionRow[]) ?? []).map(mapRow);
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

interface PostBody {
  siteId?: string | null;
  action?: string;
  status?: ActionStatus;
  channel?: string | null;
  source?: ActionSource;
  link?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PostBody;
    const action = body.action?.trim();
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }
    if (body.siteId && !SITE_IDS.includes(body.siteId)) {
      return NextResponse.json({ error: 'invalid siteId' }, { status: 400 });
    }
    const status: ActionStatus = STATUSES.includes(body.status as ActionStatus)
      ? (body.status as ActionStatus)
      : 'in_progress';
    const source: ActionSource = SOURCES.includes(body.source as ActionSource)
      ? (body.source as ActionSource)
      : 'manual';

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('actions_log')
      .insert({
        site_id: body.siteId ?? null,
        channel: body.channel ?? null,
        action,
        status,
        source,
        link: body.link ?? null,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      .select(SELECT_COLS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: mapRow(data as ActionRow) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

interface PatchBody {
  id?: string;
  status?: ActionStatus;
  action?: string;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchBody;
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 });
      }
      patch.status = body.status;
      patch.completed_at = body.status === 'done' ? new Date().toISOString() : null;
    }
    if (body.action !== undefined) {
      const action = body.action.trim();
      if (!action) return NextResponse.json({ error: 'action cannot be empty' }, { status: 400 });
      patch.action = action;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('actions_log')
      .update(patch)
      .eq('id', body.id)
      .select(SELECT_COLS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: mapRow(data as ActionRow) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from('actions_log').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
