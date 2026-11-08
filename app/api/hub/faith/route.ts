// ── Faith header store ───────────────────────────────────────────────────────
//   GET  /api/hub/faith   → { faith, persistence }
//   PUT  /api/hub/faith   body: any of { word, bible, prayerPoints, fast } → { faith, persistence }
// Stored as one row (key 'faith') in the Supabase table `hub_settings` (see
// supabase/migrations/20261106120000_hub_settings.sql). If the table can't be
// reached, GET still answers (empty) with persistence 'unavailable' and PUT
// returns 503, so the page can keep the edit on the device and say so.
// Auth is enforced app-wide by the root proxy.ts — no per-route check here.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { EMPTY_FAITH, mergeFaith, normaliseFaith, parseFaithPatch, type FaithState } from '@/app/lib/hub/faith';

export const dynamic = 'force-dynamic';

const KEY = 'faith';
const NO_STORE = { 'Cache-Control': 'no-store' };

export interface FaithResponse {
  faith: FaithState;
  persistence: 'saved' | 'unavailable';
  error?: string;
}

async function load(): Promise<{ faith: FaithState; ok: boolean }> {
  try {
    const { data, error } = await getSupabase().from('hub_settings').select('value').eq('key', KEY).maybeSingle();
    if (error) return { faith: EMPTY_FAITH, ok: false };
    return { faith: normaliseFaith((data as { value: unknown } | null)?.value), ok: true };
  } catch {
    return { faith: EMPTY_FAITH, ok: false };
  }
}

export async function GET() {
  const { faith, ok } = await load();
  return NextResponse.json({ faith, persistence: ok ? 'saved' : 'unavailable' } satisfies FaithResponse, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseFaithPatch(body);
  if ('error' in parsed) {
    return NextResponse.json({ faith: EMPTY_FAITH, persistence: 'unavailable', error: parsed.error } satisfies FaithResponse, { status: 400, headers: NO_STORE });
  }

  const { faith: current, ok } = await load();
  if (!ok) {
    return NextResponse.json({ faith: current, persistence: 'unavailable', error: 'Store unreachable' } satisfies FaithResponse, { status: 503, headers: NO_STORE });
  }
  const next = mergeFaith(current, parsed.patch);
  try {
    const { error } = await getSupabase()
      .from('hub_settings')
      .upsert({ key: KEY, value: next, updated_at: new Date().toISOString() });
    if (error) throw error;
    return NextResponse.json({ faith: next, persistence: 'saved' } satisfies FaithResponse, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ faith: current, persistence: 'unavailable', error: 'Could not save' } satisfies FaithResponse, { status: 503, headers: NO_STORE });
  }
}
