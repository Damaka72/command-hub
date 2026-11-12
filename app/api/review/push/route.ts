// ── Review → Blotato push ─────────────────────────────────────────────────────
// POST /api/review/push  { week: 'YYYY-MM-DD', siteId?: string }
//
// The ONLY code path allowed to publish to Blotato. Loads approved rows (and
// approved_needs_media rows) from content_library, builds payloads from
// agents/accounts.ts (no inline IDs), schedules each in Europe/London time
// (LinkedIn 08:00, Facebook 10:00, Twitter/X 12:00, others 09:00) on its weekday
// in the target week and pushes to the Blotato v2 REST API. A slot that has passed
// the same day goes out 10 minutes from now; a day that is already over is skipped
// (never rolled forward a week). Posts the Brand gate blocked are never pushed.
//
// This route is the hub's fallback publisher. The normal path is: Didi approves in
// the Sunday review, then Cowork schedules the approved rows in Blotato.
//
// Media: each row's media_urls (public image/video URLs attached in the review
// queue) are forwarded in content.mediaUrls. Instagram/TikTok/Pinterest/YouTube
// cannot publish without media, so those rows are skipped until a URL is attached;
// LinkedIn/Facebook publish with or without one. Instagram posts a video as a reel.
//
// On success: status 'pushed' + blotato_submission_id + scheduled_for.
// On failure: status stays 'approved' + push_error (so it can be retried).
//
// Auth: requires the Hub's httpOnly `hub_auth` cookie (set by /api/auth). Publishing
// to social media must never be callable unauthenticated.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { ACCOUNT_MAP, MEDIA_REQUIRED_PLATFORMS, isVideoUrl } from '@/agents/accounts';
import { callBlotato } from '@/app/lib/blotato';

export const dynamic = 'force-dynamic';

const DAY_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
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

// London calendar date (YYYY-MM-DD) and hour for an instant.
function londonNow(at: Date): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

// The scheduled instant for a row, or a reason it cannot be scheduled.
//
//   * Slot still ahead: its weekday in the target week at the platform's London hour.
//   * Slot already passed, but it is still that same day: post 10 minutes from
//     now, so a date-sensitive post ("14 days to go") still goes out on the day
//     it was written for. After 21:00 London time it is too late for that day.
//   * That day is already over: skip it. It used to roll forward a whole week,
//     which silently put out stale posts (a Monday countdown a week late).
function scheduleFor(
  weekCommencing: string, dayName: string, platform: string,
): { at: Date } | { skip: string } {
  const hour = londonHourFor(platform);
  const [wy, wm, wd] = weekCommencing.split('-').map(Number);
  const dt = new Date(Date.UTC(wy, wm - 1, wd + (DAY_OFFSET[dayName] ?? 0)));
  const y = dt.getUTCFullYear(), m = dt.getUTCMonth(), d = dt.getUTCDate();

  const slot = londonWallTimeToUtc(y, m, d, hour);
  const now = new Date();
  if (slot.getTime() > now.getTime()) return { at: slot };

  const targetYmd = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const today = londonNow(now);
  if (today.ymd === targetYmd) {
    if (today.hour >= 21) return { skip: 'Too late today (after 21:00). Edit it for another day or reject it' };
    return { at: new Date(now.getTime() + 10 * 60 * 1000) };
  }
  return { skip: `${dayName}'s slot has passed. Edit the post for another day, or reject it` };
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

// Build the platform `target` object for a row, applying per-post dynamics that
// can't be static in ACCOUNT_MAP. Instagram: a video attachment publishes as a
// reel (mediaType 'reel'); image(s) publish to the feed (no mediaType).
function buildTarget(platform: string, baseTarget: Record<string, unknown>, mediaUrls: string[]): Record<string, unknown> {
  const target: Record<string, unknown> = { targetType: platform, ...baseTarget };
  if (platform === 'instagram' && mediaUrls.some(isVideoUrl)) {
    target.mediaType = 'reel';
  }
  return target;
}

export async function POST(request: NextRequest) {
  // Auth is enforced app-wide by the root `proxy.ts` (the httpOnly hub_auth
  // cookie gate). Do NOT re-add a per-route check here — it would drift out of
  // sync with the single auth boundary.

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

    // Push both 'approved' and 'approved_needs_media'. The needs-media rows only go
    // out once a media URL is attached; without one they are skipped and left as-is.
    let query = supabase
      .from('content_library')
      .select('*')
      .eq('week_commencing', week)
      .in('status', ['approved', 'approved_needs_media']);
    if (siteId) query = query.eq('site_id', siteId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as {
      id: string; site_id: string; day_name: string; platform: string;
      content: string; edited_content: string | null; media_urls: unknown;
      gate_verdict?: string | null;
    }[];

    const results: PushResult[] = [];

    for (const row of rows) {
      // Defence in depth: the Brand gate's "blocked" verdict can never be published,
      // even if a row was approved before the gate looked at it.
      if (row.gate_verdict === 'blocked') {
        results.push({
          id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
          status: 'skipped',
          error: 'Blocked by the Brand gate. Fix it and have it re-checked first',
        });
        continue;
      }

      const acct = ACCOUNT_MAP[row.site_id]?.[row.platform];
      if (acct == null) {
        // null (not a publish target) or undefined (not configured) — leave as-is.
        results.push({
          id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
          status: 'skipped',
          error: acct === null ? 'Platform not a publish target' : 'Platform not in account map',
        });
        continue;
      }

      // Normalise the row's attached media into a clean string[] of URLs.
      const mediaUrls = Array.isArray(row.media_urls)
        ? (row.media_urls as unknown[]).filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map(u => u.trim())
        : [];

      // Instagram/TikTok/etc. can't publish without media — hold them back (they
      // keep their approved_needs_media status so they resurface next push).
      if (MEDIA_REQUIRED_PLATFORMS.has(acct.platform) && mediaUrls.length === 0) {
        results.push({
          id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
          status: 'skipped',
          error: 'Needs media — attach an image/video URL, then push',
        });
        continue;
      }

      const text = row.edited_content ?? row.content;
      const target = buildTarget(acct.platform, acct.target, mediaUrls);
      const when = scheduleFor(week, row.day_name, acct.platform);
      if ('skip' in when) {
        results.push({
          id: row.id, siteId: row.site_id, platform: row.platform, day: row.day_name,
          status: 'skipped', error: when.skip,
        });
        continue;
      }
      const scheduledIso = when.at.toISOString();

      try {
        const { postSubmissionId, error: pushErr } = await callBlotato(
          apiKey, acct.accountId, acct.platform, text, target, mediaUrls, scheduledIso,
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
