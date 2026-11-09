// ── Review API ────────────────────────────────────────────────────────────────
// GET   /api/review?week=YYYY-MM-DD  — content_library rows for the week.
// PATCH /api/review                  — save an item's edited_content / media_urls
//                                       / asset metadata.
// POST  /api/review                  — bulk approve / reject / request_creation.
//
// Publishing is handled separately by /api/review/push. This route only manages
// draft text and the review status. Allowed statuses are enforced by a DB check
// constraint: draft, approved, approved_needs_media, rejected, pushed, failed.
//
// Asset creation (video-batch-producer etc.) is requested here via
// request_creation, which only sets creation_requested_at — it never invents a
// new status. A media-required row is already "needs media"; this column is
// just the worklist marker a creation run polls, distinguishing "flagged" from
// "nobody has asked yet". The asset actually lands via POST /api/library/asset.

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

    // select('*') on purpose: the Brand gate and layer columns (migration
    // 20261109120000) may not exist yet, and an explicit column list would make
    // this whole query fail until they do. The page treats missing ones as
    // "not yet checked".
    const { data, error } = await supabase
      .from('content_library')
      .select('*')
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

    const { data: current } = await supabase
      .from('content_library')
      .select('*')
      .eq('id', id)
      .single();

    // A row parked as approved_needs_media clears to approved the moment it
    // actually has media — whether that URL was pasted by hand here or attached
    // by a creation run via /api/library/asset. Mirrors the same check the bulk
    // 'approve' action below uses.
    if (Array.isArray(update.media_urls) && (update.media_urls as string[]).length > 0) {
      if (current?.status === 'approved_needs_media') {
        update.status = 'approved';
      }
    }

    // Any change to the wording invalidates the Brand gate's verdict: send the post
    // back to "not yet checked" so Cowork re-checks the new text. Only touches the
    // gate columns when they exist (migration 20261109120000).
    if (
      current && 'gate_verdict' in current && current.gate_verdict &&
      update.edited_content !== undefined &&
      update.edited_content !== (current.edited_content ?? current.content)
    ) {
      update.gate_verdict    = null;
      update.gate_reason     = null;
      update.gate_checked_at = null;
    }

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

    if (action === 'request_creation') {
      const { error } = await supabase
        .from('content_library')
        .update({ creation_requested_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
      return NextResponse.json({ ok: true, updated: ids.length });
    }

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
        .select('*')
        .in('id', ids);
      if (selErr) throw selErr;

      // A post the Brand gate has blocked can never be approved, whatever the
      // page sends. It has to be fixed (and re-checked) first.
      const allRows = (data ?? []) as { id: string; platform: string; media_urls: unknown; gate_verdict?: string | null }[];
      const blockedIds = allRows.filter(r => r.gate_verdict === 'blocked').map(r => r.id);
      const rows = allRows.filter(r => r.gate_verdict !== 'blocked');
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
      return NextResponse.json({
        ok: true,
        approved: otherIds.length,
        approvedNeedsMedia: mediaIds.length,
        skippedBlocked: blockedIds.length,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Could not update review status', detail: String(err) }, { status: 500 });
  }
}
