// ── Newsletter research brief ─────────────────────────────────────────────────
// POST /api/newsletters/research  { publication, week }
//
// The "research facility" step. Produces a short research brief for one
// publication/week and writes it to newsletters.research_brief. The brief is the
// editorial angle for the issue, distilled from:
//
//   1. The weekly-plan theme(s) for the publication's site(s) (weekly_plan), and
//   2. The week's social highlights (content_library, grader_verdict = 'pass'):
//        • this week's passed posts, and
//        • the best past performers from earlier weeks.
//
// The draft generator (../draft) then builds the full issue from this brief plus
// the same highlights. The brief is a per-publication artefact stored on the
// newsletter row — separate from the per-site research_briefs table that feeds
// the pre-week content pipeline.
//
// As in ../draft, "best past performers" is proxied by funnel status then
// recency (no engagement metrics exist yet); only rankPastHighlights() changes
// when real metrics land.

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
      return b.week_commencing.localeCompare(a.week_commencing);
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

const SYSTEM = `You are a research editor preparing the brief for one issue of an
email newsletter. You are given the week's planned theme and a set of recent
social media posts the brand published.

Study the social posts to find what is actually resonating — the recurring
themes, the strongest angles, the specific stories and data points worth
carrying into the newsletter. Combine that with the planned theme to define a
single clear editorial angle for this issue.

Write a tight research brief (roughly 120-250 words) that a writer could hand
straight to a drafting step. Use short markdown sections:

## Angle
One or two sentences: what this issue is really about.

## Key themes
3-5 bullet points drawn from the social highlights and the theme — the specific
threads to build sections around.

## Talking points
A few concrete facts, stories, or hooks worth including.

## Tone note
One line on how to pitch it for this audience.

Return only the brief as markdown. No preamble, no JSON.`;

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

    const [plan, thisWeek, past] = await Promise.all([
      supabase
        .from('weekly_plan')
        .select('sites')
        .eq('week_commencing', week)
        .maybeSingle(),
      supabase
        .from('content_library')
        .select('site_id, week_commencing, day_name, platform, status, content, edited_content')
        .eq('week_commencing', week)
        .eq('grader_verdict', 'pass')
        .in('site_id', pub.siteIds),
      supabase
        .from('content_library')
        .select('site_id, week_commencing, day_name, platform, status, content, edited_content')
        .eq('grader_verdict', 'pass')
        .in('site_id', pub.siteIds)
        .lt('week_commencing', week)
        .order('week_commencing', { ascending: false })
        .limit(60),
    ]);

    if (plan.error)     throw plan.error;
    if (thisWeek.error) throw thisWeek.error;
    if (past.error)     throw past.error;

    // Weekly-plan themes for this publication's site(s).
    const planSites = (plan.data?.sites ?? {}) as Record<string, { theme?: string; notes?: string }>;
    const themes = pub.siteIds
      .map(id => {
        const s = planSites[id];
        if (!s?.theme) return null;
        return `[${SITE_SHORT[id] ?? id}] ${s.theme}${s.notes ? ` — ${s.notes}` : ''}`;
      })
      .filter((t): t is string => Boolean(t));

    const thisWeekRows = (thisWeek.data ?? []) as LibraryRow[];
    const pastRows     = rankPastHighlights((past.data ?? []) as LibraryRow[]);

    if (themes.length === 0 && thisWeekRows.length === 0 && pastRows.length === 0) {
      return NextResponse.json({
        error: 'Nothing to research from — no weekly-plan theme or grader-passed content for this week.',
      }, { status: 422 });
    }

    const themeSection = themes.length ? themes.join('\n') : '(no theme set in the weekly plan this week)';
    const thisWeekSection = thisWeekRows.length ? thisWeekRows.map(formatHighlight).join('\n\n') : '(none)';
    const pastSection = pastRows.length ? pastRows.map(formatHighlight).join('\n\n') : '(none)';

    const userPrompt = `Newsletter: ${pub.title}
Week commencing: ${week}
Audience: ${pub.audience}
Editorial voice: ${pub.voice}

── PLANNED THEME(S) ──
${themeSection}

── THIS WEEK'S SOCIAL HIGHLIGHTS ──
${thisWeekSection}

── BEST PAST PERFORMERS ──
${pastSection}

Write the research brief for this week's issue of ${pub.title}.`;

    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Unexpected response from the model');
    }
    const brief = textBlock.text.trim();
    if (!brief) {
      return NextResponse.json({ error: 'The model returned an empty brief' }, { status: 502 });
    }

    // Write research_brief only; leave draft/edited content and status untouched.
    const { data, error } = await supabase
      .from('newsletters')
      .upsert(
        { publication, week_commencing: week, research_brief: brief },
        { onConflict: 'publication,week_commencing' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      newsletter: data,
      researchBrief: brief,
      sources: { themes: themes.length, thisWeekPosts: thisWeekRows.length, pastHighlights: pastRows.length },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not generate research brief', detail: String(err) },
      { status: 500 },
    );
  }
}
