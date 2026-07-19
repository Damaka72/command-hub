// ── Newsletters API ───────────────────────────────────────────────────────────
// GET   /api/newsletters?week=YYYY-MM-DD  — per publication: its newsletter row
//                                           (or null), that week's research
//                                           briefs for its site(s), and the
//                                           grader-passed content_library rows.
// PATCH /api/newsletters                  — save a publication's edits
//                                           (edited_content / subject_options /
//                                           repurposed_from); creates a draft row
//                                           if none exists yet.
// POST  /api/newsletters                  — status transition draft → finalised →
//                                           sent; stamps sent_at on → sent.
//
// Same shape as app/api/review/route.ts. Auth is enforced app-wide by the root
// proxy.ts (the hub_auth boundary) — no per-route check here.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PUBLICATIONS, PUBLICATION_SLUGS } from '@/app/lib/siteConstants';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'finalised', 'sent'] as const;
type Status = (typeof STATUSES)[number];

// All site_ids referenced by any publication (for the briefs / library queries).
const ALL_SITE_IDS = [...new Set(PUBLICATIONS.flatMap(p => p.siteIds))];

interface NewsletterRow {
  id:               number;
  publication:      string;
  week_commencing:  string;
  status:           string;
  subject_options:  unknown;
  research_brief:   string | null;
  draft_content:    string | null;
  edited_content:   string | null;
  repurposed_from:  string[] | null;
  sent_at:          string | null;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const week = new URL(request.url).searchParams.get('week');
    if (!week) {
      return NextResponse.json({ error: 'week query param is required' }, { status: 400 });
    }

    const [nl, briefs, library] = await Promise.all([
      supabase
        .from('newsletters')
        .select('id, publication, week_commencing, status, subject_options, research_brief, draft_content, edited_content, repurposed_from, sent_at')
        .eq('week_commencing', week),
      supabase
        .from('research_briefs')
        .select('id, site_id, week_commencing, brief, source, created_at')
        .eq('week_commencing', week)
        .in('site_id', ALL_SITE_IDS),
      supabase
        .from('content_library')
        .select('id, site_id, week_commencing, day_name, platform, grader_verdict, content, edited_content')
        .eq('week_commencing', week)
        .eq('grader_verdict', 'pass')
        .in('site_id', ALL_SITE_IDS),
    ]);

    if (nl.error) throw nl.error;
    if (briefs.error) throw briefs.error;
    if (library.error) throw library.error;

    const newsletters = (nl.data ?? []) as NewsletterRow[];
    const briefRows   = briefs.data ?? [];
    const libraryRows = library.data ?? [];

    const publications = PUBLICATIONS.map(p => ({
      slug:       p.slug,
      title:      p.title,
      siteIds:    p.siteIds,
      newsletter: newsletters.find(n => n.publication === p.slug) ?? null,
      briefs:     briefRows.filter(b => p.siteIds.includes(b.site_id as string)),
      library:    libraryRows.filter(l => p.siteIds.includes(l.site_id as string)),
    }));

    return NextResponse.json({ week, publications });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load newsletters', detail: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const publication: string = body.publication;
    const week: string        = body.week;
    if (!PUBLICATION_SLUGS.includes(publication as never)) {
      return NextResponse.json({ error: 'valid publication is required' }, { status: 400 });
    }
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });

    // Only the fields present in the request are updated.
    const fields: Record<string, unknown> = { publication, week_commencing: week };
    if ('editedContent'  in body) fields.edited_content  = body.editedContent ?? null;
    if ('researchBrief'  in body) fields.research_brief  = body.researchBrief ?? null;
    if ('subjectOptions' in body) fields.subject_options = body.subjectOptions ?? null;
    if ('repurposedFrom' in body) fields.repurposed_from = Array.isArray(body.repurposedFrom) ? body.repurposedFrom : null;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('newsletters')
      .upsert(fields, { onConflict: 'publication,week_commencing' })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, newsletter: data });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save newsletter', detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const publication: string = body.publication;
    const week: string        = body.week;
    const status: Status      = body.status;
    if (!PUBLICATION_SLUGS.includes(publication as never)) {
      return NextResponse.json({ error: 'valid publication is required' }, { status: 400 });
    }
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });
    if (!STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 });
    }

    const fields: Record<string, unknown> = {
      publication,
      week_commencing: week,
      status,
      // Stamp sent_at only on the transition into 'sent'; clear it otherwise.
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    };

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('newsletters')
      .upsert(fields, { onConflict: 'publication,week_commencing' })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, newsletter: data });
  } catch (err) {
    return NextResponse.json({ error: 'Could not update newsletter status', detail: String(err) }, { status: 500 });
  }
}
