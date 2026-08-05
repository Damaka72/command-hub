// ── Site research brief ───────────────────────────────────────────────────────
// POST /api/research  { siteId, week, action: 'generate' | 'save', brief? }
//
// The per-site counterpart to the weekly plan's theme. This is what should have
// happened in the manual Saturday "Cowork research session" (see the Ops Guide)
// but automated: a live, cited web search grounded in this site's audience and
// content pillars, written to research_briefs. The pipeline already reads this
// table (agents/coordinator.ts) and seeds it into each site's brief-generation
// prompt — this route is the only thing that was missing.
//
// 'generate' runs a fresh web search and overwrites the brief for this site/week.
// 'save' upserts caller-supplied text as-is (a human edit) with no search call,
// so editing a generated brief doesn't re-trigger (and re-cost) a search.
//
// Research is intentionally independent of that week's theme — in the existing
// rhythm, research happens before the theme is set.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/app/lib/supabase';
import { SITE_CONFIGS, getSitePillars } from '@/agents/site-configs';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-6';
const MAX_SEARCHES = 5;

function pillarBlock(siteId: string): string {
  return getSitePillars(siteId).map(p => `- ${p.name} — ${p.description}`).join('\n');
}

function buildSystem(site: (typeof SITE_CONFIGS)[number]): string {
  return `You are a research editor preparing this week's research brief for ${site.name}
(${site.url}), ahead of that week's content being written.

Audience: ${site.audience}
Tone: ${site.tone}

Content pillars:
${pillarBlock(site.id)}

This week's research focus: ${site.researchFocus}

Use the web_search tool to find what is genuinely happening right now — real,
dated news, data, and developments relevant to this audience and focus. Do not
rely on prior knowledge alone; search first. Every factual claim in the brief
must be something the search results actually returned — if you did not find
it via search, do not state it. Tag each factual claim inline with its source
and date, e.g. "(Source: BBC News, 3 Aug 2026)".

Write a tight research brief (roughly 120-250 words) that a writer could hand
straight to a content-brief step. Use short markdown sections:

## Angle
One or two sentences: the genuine, current angle this week's content should
build from.

## Key themes
3-5 bullet points drawn from what you found — the specific, dated threads
worth building content around.

## Talking points
A few concrete facts, stories, or hooks worth including, each with an inline
source + date.

## Tone note
One line on how to pitch this for the audience above.

Return only the brief as markdown. No preamble, no JSON, no closing remarks.`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const siteId: string = body.siteId;
    const week: string   = body.week;
    const action: string = body.action;

    const site = SITE_CONFIGS.find(s => s.id === siteId);
    if (!site) return NextResponse.json({ error: 'valid siteId is required' }, { status: 400 });
    if (!week) return NextResponse.json({ error: 'week is required' }, { status: 400 });
    if (action !== 'generate' && action !== 'save') {
      return NextResponse.json({ error: "action must be 'generate' or 'save'" }, { status: 400 });
    }

    const supabase = getSupabase();

    if (action === 'save') {
      const brief: string = (body.brief ?? '').trim();
      if (!brief) return NextResponse.json({ error: 'brief is required for save' }, { status: 400 });

      const { data, error } = await supabase
        .from('research_briefs')
        .upsert(
          { site_id: siteId, week_commencing: week, brief, source: 'web' },
          { onConflict: 'site_id,week_commencing' },
        )
        .select()
        .single();
      if (error) throw error;

      return NextResponse.json({ ok: true, brief: data.brief, siteId });
    }

    // action === 'generate'
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: buildSystem(site),
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
      messages: [{ role: 'user', content: `Research and write this week's research brief for ${site.name}, week commencing ${week}.` }],
    });

    const brief = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
      .trim();

    if (!brief) {
      return NextResponse.json({ error: 'The model returned an empty brief' }, { status: 502 });
    }

    const { data, error } = await supabase
      .from('research_briefs')
      .upsert(
        { site_id: siteId, week_commencing: week, brief, source: 'web' },
        { onConflict: 'site_id,week_commencing' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, brief: data.brief, siteId });
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not generate research brief', detail: String(err) },
      { status: 500 },
    );
  }
}
