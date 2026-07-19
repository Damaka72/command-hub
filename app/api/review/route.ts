// ── Review API ────────────────────────────────────────────────────────────────
// GET   /api/review?week=YYYY-MM-DD  — content_library rows for the week.
// PATCH /api/review                  — save an item's edited_content.
// POST  /api/review                  — bulk approve / reject items.
//
// Publishing is handled separately by /api/review/push. This route only manages
// draft text and the review status. Allowed statuses are enforced by a DB check
// constraint: draft, approved, approved_needs_media, rejected, pushed, failed.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// Platforms that need media (image/video) attached before they can publish.
// Approving one of these parks it as approved_needs_media, not approved.
const MEDIA_PLATFORMS = new Set(['Instagram', 'TikTok', 'Pinterest', 'YouTube']);

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const week = new URL(request.url).searchParams.get('week');
    if (!week) {
      return NextResponse.json({ error: 'week query param is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('content_library')
      .select('id, site_id, week_commencing, day_name, platform, grader_verdict, status, content, edited_content, media_urls, approved_at, blotato_submission_id, scheduled_for, push_error')
      .eq('week_commencing', week);
    if (error) throw error;

    return NextResponse.json({ week, rows: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load review data', detail: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, editedContent, mediaUrls } = body;
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Only update the fields the caller actually sent, so saving media never
    // clobbers edited text and vice versa.
    const update: Record<string, unknown> = {};
    if (editedContent !== undefined) update.edited_content = editedContent ?? null;
    if (mediaUrls !== undefined) {
      update.media_urls = Array.isArray(mediaUrls)
        ? mediaUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0).map((u: string) => u.trim())
        : [];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('content_library')
      .update(update)
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save edit', detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action: string = body.action;
    const ids: string[]  = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ error: 'ids is required' }, { status: 400 });

    const supabase = getSupabase();

    if (action === 'reject') {
      const { error } = await supabase
        .from('content_library')
        .update({ status: 'rejected', approved_at: null })
        .in('id', ids);
      if (error) throw error;
      return NextResponse.json({ ok: true, updated: ids.length });
    }

    if (action === 'approve') {
      // A media platform only parks as approved_needs_media when it has NO media
      // attached yet. Once media_urls is populated the row is fully approved, so
      // we must read that column here (the same one GET returns) and not bucket
      // by platform alone. Everything else approves straight through.
      const { data, error: selErr } = await supabase
        .from('content_library')
        .select('id, platform, media_urls')
        .in('id', ids);
      if (selErr) throw selErr;

      const rows = (data ?? []) as { id: string; platform: string; media_urls: unknown }[];
      const now = new Date().toISOString();

      // A row satisfies the media requirement when media_urls holds at least one
      // non-empty string URL (mirrors the normalisation in PATCH and the push route).
      const hasMedia = (mediaUrls: unknown): boolean =>
        Array.isArray(mediaUrls) &&
        mediaUrls.some(u => typeof u === 'string' && u.trim().length > 0);

      const needsMedia = (r: { platform: string; media_urls: unknown }): boolean =>
        MEDIA_PLATFORMS.has(r.platform) && !hasMedia(r.media_urls);

      const mediaIds = rows.filter(needsMedia).map(r => r.id);
      const otherIds = rows.filter(r => !needsMedia(r)).map(r => r.id);

      if (mediaIds.length) {
        const { error } = await supabase
          .from('content_library')
          .update({ status: 'approved_needs_media', approved_at: now })
          .in('id', mediaIds);
        if (error) throw error;
      }
      if (otherIds.length) {
        const { error } = await supabase
          .from('content_library')
          .update({ status: 'approved', approved_at: now })
          .in('id', otherIds);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, approved: otherIds.length, approvedNeedsMedia: mediaIds.length });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Could not update review status', detail: String(err) }, { status: 500 });
  }
}
