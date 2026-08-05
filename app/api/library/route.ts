// ── Library API ───────────────────────────────────────────────────────────────
// GET  /api/library — every content_library row across all weeks (newest week
//        first, capped), plus the distinct site/platform values present so the
//        browse view can build its filter dropdowns.
// POST /api/library — "Repurpose": insert a NEW content_library row that
//        copies an existing row's content into a chosen site/week/day/platform,
//        with repurposed_from_id pointing back at the source. The original row
//        is never touched.
//
//        Text repurposes (the default, assetType omitted) behave exactly as
//        before: status 'draft', ready for the normal review flow.
//
//        Asset repurposes (assetType: 'image'|'carousel'|'video' — e.g. "cut
//        this video for TikTok") skip straight to 'approved_needs_media' with
//        creation_requested_at set, so the new row lands directly on a creation
//        run's worklist instead of waiting in the draft queue. `content` on
//        that row is the repurpose brief, not finished copy.
//
// Same conventions as the other route handlers. Auth is enforced app-wide by the
// root proxy.ts (the hub_auth boundary) — no per-route check here.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';

export const dynamic = 'force-dynamic';

// Sites that own content_library rows (repurpose targets). didianolue is handled
// personally and has no pipeline content.
const SITE_ORDER = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const MAX_ROWS = 500;

interface LibraryRow {
  id:                 string;
  site_id:            string;
  week_commencing:    string | null;
  day_name:           string | null;
  platform:           string | null;
  status:             string;
  content:            string | null;
  edited_content:     string | null;
  repurposed_from_id: string | null;
  media_urls:         string[] | null;
  asset_type:         string | null;
  creation_tool:      string | null;
  aspect_ratio:       string | null;
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('content_library')
      .select('id, site_id, week_commencing, day_name, platform, status, content, edited_content, repurposed_from_id, media_urls, asset_type, creation_tool, aspect_ratio')
      .order('week_commencing', { ascending: false, nullsFirst: false })
      .limit(MAX_ROWS);
    if (error) throw error;

    const rows = (data ?? []) as LibraryRow[];

    // Distinct filter options actually present in the data.
    const platforms = [...new Set(rows.map(r => r.platform).filter((p): p is string => !!p))].sort();
    const sites     = [...new Set(rows.map(r => r.site_id))].sort();

    return NextResponse.json({ rows, sites, platforms });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load content library', detail: String(err) }, { status: 500 });
  }
}

const ASSET_TYPES = new Set(['image', 'carousel', 'video']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceId:   string = body.sourceId;
    const siteId:     string = body.siteId;
    const week:       string = body.week;
    const day:        string = body.day;
    const platform:   string = body.platform;
    const content:    string = body.content;
    const assetType:  string | undefined = body.assetType;

    if (!sourceId)                        return NextResponse.json({ error: 'sourceId is required' },            { status: 400 });
    if (!SITE_ORDER.includes(siteId))     return NextResponse.json({ error: 'a valid target site is required' }, { status: 400 });
    if (!week)                            return NextResponse.json({ error: 'target week is required' },         { status: 400 });
    if (!DAY_NAMES.includes(day))         return NextResponse.json({ error: 'target day must be Monday–Friday' },{ status: 400 });
    if (!platform || !platform.trim())    return NextResponse.json({ error: 'target platform is required' },     { status: 400 });
    if (!content || !content.trim())      return NextResponse.json({ error: 'content is required' },             { status: 400 });
    if (assetType !== undefined && !ASSET_TYPES.has(assetType)) {
      return NextResponse.json({ error: `assetType must be one of ${[...ASSET_TYPES].join(', ')}` }, { status: 400 });
    }

    const isAssetRepurpose = assetType !== undefined;
    const now = new Date().toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('content_library')
      .insert({
        site_id:               siteId,
        week_commencing:       week,
        day_name:              day,
        platform:              platform.trim(),
        content,
        status:                isAssetRepurpose ? 'approved_needs_media' : 'draft',
        repurposed_from_id:    sourceId,
        generated_at:          now,
        ...(isAssetRepurpose ? { asset_type: assetType, creation_requested_at: now, approved_at: now } : {}),
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, row: data });
  } catch (err) {
    return NextResponse.json({ error: 'Could not repurpose content', detail: String(err) }, { status: 500 });
  }
}
