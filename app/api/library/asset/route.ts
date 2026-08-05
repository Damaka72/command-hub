// ── Asset-attach API ─────────────────────────────────────────────────────────
// POST /api/library/asset — the interface a creation run (video-producer,
// video-batch-producer, or a future repurposing session) calls once a finished
// asset exists in Drive, to attach it to its content_library row. This is the
// "point the video skill's output at this schema" hop from the Phase 1 scope:
// a Drive folder alone isn't queryable, this makes the asset a first-class part
// of the row it belongs to.
//
// Resolves the target row by id, or — if the caller doesn't have the row id
// handy — by the same (site_id, week_commencing, day_name, platform) unique key
// the review queue already keys rows by. Builds the Blotato-facing media_urls
// entry from the Drive file id via the direct-download bridge (see lib/drive.ts
// for the accepted trade-off there), and clears approved_needs_media to
// approved the same way a manually-pasted URL does in /api/review.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { driveDirectDownloadUrl } from '@/app/lib/drive';

export const dynamic = 'force-dynamic';

const ASSET_TYPES = new Set(['image', 'carousel', 'video']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id, siteId, week, day, platform,
      driveFileId, assetType, creationTool,
      assetDurationS, aspectRatio, mediaUrl,
    } = body;

    if (!driveFileId || typeof driveFileId !== 'string') {
      return NextResponse.json({ error: 'driveFileId is required' }, { status: 400 });
    }
    if (!ASSET_TYPES.has(assetType)) {
      return NextResponse.json({ error: `assetType must be one of ${[...ASSET_TYPES].join(', ')}` }, { status: 400 });
    }
    if (!creationTool || typeof creationTool !== 'string') {
      return NextResponse.json({ error: 'creationTool is required' }, { status: 400 });
    }
    if (!id && !(siteId && week && day && platform)) {
      return NextResponse.json({ error: 'either id, or siteId+week+day+platform, is required to locate the row' }, { status: 400 });
    }

    const supabase = getSupabase();

    let targetId: string = id ?? '';
    if (!targetId) {
      const { data: found, error: findErr } = await supabase
        .from('content_library')
        .select('id')
        .eq('site_id', siteId)
        .eq('week_commencing', week)
        .eq('day_name', day)
        .eq('platform', platform)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!found) return NextResponse.json({ error: 'No content_library row matches that site/week/day/platform' }, { status: 404 });
      targetId = found.id;
    }

    const { data: current, error: curErr } = await supabase
      .from('content_library')
      .select('status, media_urls')
      .eq('id', targetId)
      .single();
    if (curErr) throw curErr;
    if (!current) return NextResponse.json({ error: 'Row not found' }, { status: 404 });

    const resolvedUrl = typeof mediaUrl === 'string' && mediaUrl.trim() ? mediaUrl.trim() : driveDirectDownloadUrl(driveFileId);
    const existingUrls: string[] = Array.isArray(current.media_urls) ? current.media_urls : [];
    const nextUrls = existingUrls.includes(resolvedUrl) ? existingUrls : [...existingUrls, resolvedUrl];

    const update: Record<string, unknown> = {
      media_urls:    nextUrls,
      asset_type:    assetType,
      creation_tool: creationTool,
      drive_file_id: driveFileId,
    };
    if (assetDurationS !== undefined) update.asset_duration_s = assetDurationS;
    if (aspectRatio !== undefined)    update.aspect_ratio     = aspectRatio;
    if (current.status === 'approved_needs_media') update.status = 'approved';

    const { data: row, error: updErr } = await supabase
      .from('content_library')
      .update(update)
      .eq('id', targetId)
      .select()
      .single();
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, row });
  } catch (err) {
    return NextResponse.json({ error: 'Could not attach asset', detail: String(err) }, { status: 500 });
  }
}
