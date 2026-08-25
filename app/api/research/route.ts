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
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { getSupabase } from '@/app/lib/supabase';
import { SITE_CONFIGS, getSitePillars } from '@/agents/site-configs';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-6';
const MAX_SEARCHES = 5;

// ── Blotato/Perplexity fallback ─────────────────────────────────────────────
// Used only when the Anthropic call fails specifically because the API key's
// credit balance is exhausted. Runs the research through Blotato's own
// Perplexity-query source resolution instead — a completely separate credit
// pool from ANTHROPIC_API_KEY, so it still works when that balance hits zero.
// See https://help.blotato.com/api/create-source.

const BLOTATO_SOURCES_URL = 'https://backend.blotato.com/v2/source-resolutions-v3';

function isAnthropicCreditError(err: unknown): boolean {
  if (!(err instanceof APIError)) return false;
  return err.status === 400 && /credit balance/i.test(err.message ?? '');
}

async function researchViaBlotatoPerplexity(
  apiKey: string,
  site: (typeof SITE_CONFIGS)[number],
  week: string,
): Promise<string> {
  const query = `Research what is genuinely happening right now — real, dated news, data, `
    + `and developments from roughly the last two weeks — relevant to: ${site.researchFocus}. `
    + `Audience: ${site.audience}. List concrete, dated facts, stories, or trends with sources, `
    + `for planning a week of social media content for ${site.name} (${site.url}), week `
    + `commencing ${week}.`;

  const createRes = await fetch(BLOTATO_SOURCES_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
    body:    JSON.stringify({ source: { sourceType: 'perplexity-query', text: query } }),
  });
  const created = (await createRes.json().catch(() => ({}))) as { id?: string; status?: string; content?: string };
  if (!createRes.ok || !created.id) {
    throw new Error(`Blotato source creation failed: ${createRes.status} ${JSON.stringify(created)}`);
  }

  // Poll until the resolution completes — queued/processing → completed/failed.
  if (created.status === 'completed' && created.content) return created.content;

  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 2_000));
    const pollRes = await fetch(`${BLOTATO_SOURCES_URL}/${created.id}`, {
      headers: { 'blotato-api-key': apiKey },
    });
    const polled = (await pollRes.json().catch(() => ({}))) as { status?: string; content?: string };
    if (polled.status === 'completed') {
      if (!polled.content) throw new Error('Blotato source resolution completed with no content');
      return polled.content;
    }
    if (polled.status === 'failed') {
      throw new Error('Blotato source resolution failed');
    }
    // else: still queued/processing — keep polling
  }
  throw new Error('Blotato source resolution timed out after 30s');
}

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

Do not narrate your search process ("I'll search for...", "Now let me check...").
Run the searches you need, then write only the finished brief.

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
    let brief: string;
    let source: 'web' | 'blotato_perplexity_fallback' = 'web';

    try {
      const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await claude.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: buildSystem(site),
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }],
        messages: [{ role: 'user', content: `Research and write this week's research brief for ${site.name}, week commencing ${week}.` }],
      });

      // The response interleaves narration ("I'll search for...") with tool calls
      // before the actual brief. Only the text blocks after the LAST tool round
      // trip are the final answer — take those, not every text block in the
      // response. Join with '' (not '\n\n'): a single sentence with a web-search
      // citation comes back as several adjacent text blocks, one per cited
      // segment, and forcing a paragraph break between them fragments the prose.
      const lastToolIndex = response.content.reduce(
        (last, b, i) => (b.type === 'server_tool_use' || b.type === 'web_search_tool_result') ? i : last,
        -1,
      );
      brief = response.content
        .slice(lastToolIndex + 1)
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
        .trim();

      if (!brief) {
        return NextResponse.json({ error: 'The model returned an empty brief' }, { status: 502 });
      }
    } catch (err) {
      // Anthropic's credit balance is a separate pool from Blotato's — if it's
      // specifically that, fall back to Blotato's own Perplexity-query research
      // rather than failing the whole Saturday research step.
      if (!isAnthropicCreditError(err) || !process.env.BLOTATO_API_KEY) throw err;
      brief = await researchViaBlotatoPerplexity(process.env.BLOTATO_API_KEY, site, week);
      source = 'blotato_perplexity_fallback';
    }

    const { data, error } = await supabase
      .from('research_briefs')
      .upsert(
        { site_id: siteId, week_commencing: week, brief, source },
        { onConflict: 'site_id,week_commencing' },
      )
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, brief: data.brief, siteId, source });
  } catch (err) {
    const outOfCredits = isAnthropicCreditError(err);
    return NextResponse.json(
      {
        error: outOfCredits ? 'out_of_credits' : 'Could not generate research brief',
        detail: String(err),
      },
      { status: outOfCredits ? 402 : 500 },
    );
  }
}
