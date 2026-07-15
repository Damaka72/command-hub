// ── Review → Blotato push ─────────────────────────────────────────────────────
// POST /api/review/push  { week: 'YYYY-MM-DD', siteId?: string }
//
// The ONLY code path allowed to publish to Blotato. Loads approved rows from
// content_library, builds payloads from agents/accounts.ts (no inline IDs),
// schedules each in Europe/London time (LinkedIn 08:00, Facebook 10:00,
// Twitter/X 12:00) on its weekday in the target week — next occurrence if the
// slot has already passed — and pushes to the Blotato v2 REST API.
//
// On success: status 'pushed' + blotato_submission_id + scheduled_for.
// On failure: status stays 'approved' + push_error (so it can be retried).
//
// Auth: requires the Hub's httpOnly `hub_auth` cookie (set by /api/auth). Publishing
// to social media must never be callable unauthenticated.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { ACCOUNT_MAP } from '@/agents/accounts';

export const dynamic = 'force-dynamic';

const BLOTATO_URL = 'https://backend.blotato.com/v2/posts';

const DAY_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4,
};

// London wall-clock posting hour per platform (converted to UTC at push time).
function londonHourFor(platform: string): number {
  switch (platform) {
    case 'linkedin': return 8;
    case 'facebook': return 10;
    case 'twitter':  return 12;
    default:         return 9;
  }
}

// Convert a wall-clock time in Europe/London to the correct UTC instant, using
// the real offset for that date (BST/GMT) rather than a hardcoded hour.
function londonWallTimeToUtc(y: number, mIdx: number, d: number, hour: number): Date {
  const targetAsUtc = Date.UTC(y, mIdx, d, hour, 0, 0);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(targetAsUtc));
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  // What London shows at the UTC guess, expressed as a UTC-based ms value.
  const londonShownAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const offset = londonShownAsUtc - targetAsUtc; // how far ahead London is (ms)
  return new Date(targetAsUtc - offset);
}

// The scheduled UTC instant for a row: its weekday in the target week at the
// platform's London hour; if that's already passed, the next weekly occurrence.
function scheduledUtc(weekCommencing: string, dayName: string, platform: string): Date {
  const hour = londonHourFor(platform);
  const [wy, wm, wd] = weekCommencing.split('-').map(Number);
  let addDays = DAY_OFFSET[dayName] ?? 0;
  for (let i = 0; i < 3; i++) {
    const dt = new Date(Date.UTC(wy, wm - 1, wd + addDays));
    const cand = londonWallTimeToUtc(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), hour);
    if (cand.getTime() > Date.now()) return cand;
    addDays += 7;
  }
  const dt = new Date(Date.UTC(wy, wm - 1, wd + addDays));
  return londonWallTimeToUtc(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), hour);
}

interface PushResult {
  id:            string;
  siteId:        string;
  platform:      string;
  day:           string;
  status:        'pushed' | 'failed' | 'skipped';
  scheduledFor?: string;
  submissionId?: string;
  error?:        string;
}

async function callBlotato(
  apiKey: string,
  accountId: string,
  platform: string,
  text: string,
  target: Record<string, unknown>,
  scheduledTime: string,
): Promise<{ postSubmissionId?: string; error?: string }> {
  const body = {
    post: {
      accountId,
      content: { text, mediaUrls: [], platform },
      target:  { targetType: platform, ...target },
    },
    scheduledTime,
  };
  const res = await fetch(BLOTATO_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
    body:    JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { error: (json?.message as string) || (json?.error as string) || res.statusText };
  }
  return { postSubmissionId: json?.postSubmissionId as string | undefined };
}

export async function POST(request: NextRequest) {
  // ── Auth: same gate as the rest of the Hub (httpOnly hub_auth cookie) ───────
  if (request.cookies.get('hub_auth')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'BLOTATO_API_KEY is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const week: string = body.week;
    const siteId: string | undefined = body.siteId || undefined;
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });

    const supabase = getSupabase();

    // Only status 'approved' is pushed. approved_needs_media rows are held back
    // (they need media attached first).
    let query = supabase
      .from('content_library')
      .select('id, site_id, day_name, platform, content, edited_content')
      .eq('week_commencing', week)
      .eq('status', 'approved');
    if (siteId) query = query.eq('site_id', siteId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as {
      id: string; site_id: string; day_name: string; platform: string;
      content: string; edited_content: string | null;
    }[];

    const results: PushResult[] = [];

    for (const row of rows) {
      const acct = ACCOUNT_MAP[row.site_id]?.[row.platform];
      if (acct == null) {
        // null (needs media) or undefined (not configured) — leave status approved.
        results.push({
          id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
          status: 'skipped',
          error: acct === null ? 'Platform requires media' : 'Platform not in account map',
        });
        continue;
      }

      const text = row.edited_content ?? row.content;
      const scheduledIso = scheduledUtc(week, row.day_name, acct.platform).toISOString();

      try {
        const { postSubmissionId, error: pushErr } = await callBlotato(
          apiKey, acct.accountId, acct.platform, text, acct.target, scheduledIso,
        );

        if (pushErr) {
          await supabase.from('content_library').update({ push_error: pushErr }).eq('id', row.id);
          results.push({ id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name, status: 'failed', error: pushErr });
        } else {
          await supabase.from('content_library').update({
            status:                'pushed',
            blotato_submission_id: postSubmissionId ?? null,
            scheduled_for:         scheduledIso,
            push_error:            null,
          }).eq('id', row.id);
          results.push({
            id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
            status: 'pushed', scheduledFor: scheduledIso, submissionId: postSubmissionId,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase.from('content_library').update({ push_error: msg }).eq('id', row.id);
        results.push({ id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name, status: 'failed', error: msg });
      }
    }

    const pushed  = results.filter(r => r.status === 'pushed').length;
    const failed  = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    return NextResponse.json({ ok: true, pushed, failed, skipped, results });
  } catch (err) {
    return NextResponse.json({ error: 'Push failed', detail: String(err) }, { status: 500 });
  }
}
