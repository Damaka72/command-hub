// ── Newsletter draft generation ───────────────────────────────────────────────
// POST /api/newsletters/draft  { publication, week }
//
// Synthesises a Beehiiv-ready newsletter draft for one publication/week from
// two research inputs and writes it to newsletters.draft_content:
//
//   1. This week's research brief(s) for the publication's site(s)
//      (research_briefs) — the "research facility" input.
//   2. Social media highlights (content_library, grader_verdict = 'pass'):
//        • this week's passed posts for the site(s), and
//        • the best past performers from earlier weeks.
//
// The model turns these into a single-voice newsletter — it does NOT paste the
// social posts through. edited_content is deliberately left untouched so a human
// edit already in progress is never clobbered; only draft_content and
// subject_options are written.
//
// NOTE on "best past performers": content_library carries no engagement metrics
// yet (no impressions / likes / views columns), so past performance is proxied
// by how far a post travelled through the funnel — pushed/approved posts rank
// above plain passed drafts — then by recency. When real engagement data lands,
// only rankPastHighlights() below needs to change.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/app/lib/supabase';
import { PUBLICATIONS, PUBLICATION_SLUGS, SITE_SHORT } from '@/app/lib/siteConstants';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-6';
const MAX_PAST_HIGHLIGHTS = 8;

interface LibraryRow {
  site_id:         string;
  week_commencing: string;
  day_name:        string;
  platform:        string;
  status:          string | null;
  content:         string;
  edited_content:  string | null;
}

// Funnel-status priority for past highlights: a pushed/approved post is proven
// material; a plain passed draft is weaker. Lower number = stronger.
function statusRank(status: string | null): number {
  switch (status) {
    case 'pushed':               return 0;
    case 'approved':             return 1;
    case 'approved_needs_media': return 1;
    default:                     return 2;
  }
}

function rankPastHighlights(rows: LibraryRow[]): LibraryRow[] {
  return rows
    .slice()
    .sort((a, b) => {
      const s = statusRank(a.status) - statusRank(b.status);
      if (s !== 0) return s;
      return b.week_commencing.localeCompare(a.week_commencing); // more recent first
    })
    .slice(0, MAX_PAST_HIGHLIGHTS);
}

function bodyText(row: LibraryRow): string {
  return (row.edited_content ?? row.content ?? '').trim();
}

function formatHighlight(row: LibraryRow): string {
  const label = `${SITE_SHORT[row.site_id] ?? row.site_id} · ${row.day_name} · ${row.platform}`;
  return `[${label}]\n${bodyText(row)}`;
}

const SYSTEM = `You are the editor of an email newsletter. You write one cohesive
issue in a single editorial voice for a specific audience.

You are given research notes and a set of recent social media posts as raw
source material. Your job is to SYNTHESISE them into a newsletter — a flowing,
readable email with a narrative through-line. You are NOT assembling a feed:
never paste the social posts through verbatim, never leave them as a list of
disconnected blurbs, and never include platform artefacts (hashtags, "link in
bio", @-handles, "swipe up", emoji spam).

Pull out the genuine themes, connect them, add editorial framing and transitions,
and speak directly to the reader. Prefer a warm, human open; 2-4 substantive
sections with clear subheadings; and a short close with a single clear call to
action. Length: roughly 400-700 words.

Return ONLY valid JSON, no markdown fences, in this exact shape:
{
  "subjectOptions": ["3 distinct subject-line options, <= 60 chars each"],
  "draft": "the full newsletter body as markdown (## subheadings, short paragraphs)"
}`;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const publication: string = body.publication;
    const week: string        = body.week;
    if (!PUBLICATION_SLUGS.includes(publication as never)) {
      return NextResponse.json({ error: 'valid publication is required' }, { status: 400 });
    }
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });

    const pub = PUBLICATIONS.find(p => p.slug === publication)!;
    const supabase = getSupabase();

    const [briefs, thisWeek, past] = await Promise.all([
      supabase
        .from('research_briefs')
        .select('site_id, brief, source')
        .eq('week_commencing', week)
        .in('site_id', pub.siteIds),
      supabase
        .from('content_library')
        .select('site_id, week_commencing, day_name, platform, status, content, edited_content')
        .eq('week_commencing', week)
        .eq('grader_verdict', 'pass')
        .in('site_id', pub.siteIds),
      // Best past performers: passed posts from earlier weeks. Bounded, then
      // ranked in JS by funnel status + recency (see rankPastHighlights).
      supabase
        .from('content_library')
        .select('site_id, week_commencing, day_name, platform, status, content, edited_content')
        .eq('grader_verdict', 'pass')
        .in('site_id', pub.siteIds)
        .lt('week_commencing', week)
        .order('week_commencing', { ascending: false })
        .limit(60),
    ]);

    if (briefs.error)   throw briefs.error;
    if (thisWeek.error) throw thisWeek.error;
    if (past.error)     throw past.error;

    const briefRows    = (briefs.data ?? []) as { site_id: string; brief: string; source: string }[];
    const thisWeekRows = (thisWeek.data ?? []) as LibraryRow[];
    const pastRows     = rankPastHighlights((past.data ?? []) as LibraryRow[]);

    if (briefRows.length === 0 && thisWeekRows.length === 0 && pastRows.length === 0) {
      return NextResponse.json({
        error: 'Nothing to draft from — no research brief or grader-passed content for this week.',
      }, { status: 422 });
    }

    const researchSection = briefRows.length
      ? briefRows.map(b => `[${SITE_SHORT[b.site_id] ?? b.site_id}] ${b.brief}`).join('\n\n')
      : '(no research brief this week)';

    const thisWeekSection = thisWeekRows.length
      ? thisWeekRows.map(formatHighlight).join('\n\n')
      : '(no passed social posts this week)';

    const pastSection = pastRows.length
      ? pastRows.map(formatHighlight).join('\n\n')
      : '(no past highlights available yet)';

    const userPrompt = `Newsletter: ${pub.title}
Week commencing: ${week}
Audience: ${pub.audience}
Editorial voice: ${pub.voice}

── RESEARCH BRIEF (this week's angle to build the issue around) ──
${researchSection}

── THIS WEEK'S SOCIAL HIGHLIGHTS (raw source — synthesise, don't paste) ──
${thisWeekSection}

── BEST PAST PERFORMERS (proven themes worth revisiting) ──
${pastSection}

Write this week's issue of ${pub.title}. Ground it in the research brief, weave
in the strongest themes from the highlights, and speak to the audience above in
the editorial voice above. Return the JSON described in your instructions.`;

    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Unexpected response from the model');
    }

    const cleaned = textBlock.text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let parsed: { subjectOptions?: unknown; draft?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fall back to treating the whole response as the draft body.
      parsed = { subjectOptions: [], draft: cleaned };
    }

    const draftContent = typeof parsed.draft === 'string' ? parsed.draft.trim() : '';
    const subjectOptions = Array.isArray(parsed.subjectOptions)
      ? parsed.subjectOptions.filter((s): s is string => typeof s === 'string').slice(0, 5)
      : [];

    if (!draftContent) {
      return NextResponse.json({ error: 'The model returned an empty draft' }, { status: 502 });
    }

    // Write draft_content + subject_options only; leave edited_content and status
    // untouched so an in-progress human edit is never clobbered.
    const { data, error } = await supabase
      .from('newsletters')
      .upsert(
        {
          publication,
          week_commencing: week,
          draft_content:   draftContent,
          subject_options: subjectOptions,
        },
        { onConflict: 'publication,week_commencing' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      newsletter: data,
      draft: draftContent,
      subjectOptions,
      sources: {
        briefs:        briefRows.length,
        thisWeekPosts: thisWeekRows.length,
        pastHighlights: pastRows.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not generate newsletter draft', detail: String(err) },
      { status: 500 },
    );
  }
}
