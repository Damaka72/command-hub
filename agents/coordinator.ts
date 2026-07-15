// ── Lead Coordinator Agent ────────────────────────────────────────────────────
// Reads content-coordinator.json, generates five weekday briefs per site
// (Monday–Friday). Returns a flat array of SiteBrief objects — 20 total for
// a full four-site run.

import { CoordinatorData, SiteBrief } from './types.js';
import { SITE_CONFIGS } from './site-configs.js';
import {
  ask, parseJson, getWeeklyPlan, getResearchBriefs,
  MODEL_GENERATION, logOk, logError,
} from './utils.js';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const COORDINATOR_SYSTEM = `You are the lead content coordinator for a four-site digital portfolio.
Your job is to take a weekly content theme for a specific site and generate five distinct daily
content briefs — one for each weekday (Monday to Friday).

Each brief must be a meaningfully different angle on the same theme. Together they should give
a rounded view of the topic across the week without repetition. Vary the angle, the audience
touchpoint, the format (e.g. story vs. insight vs. question vs. data point), and the CTA
intensity across the five days.

The theme is your creative foundation — but the site's audience comes first. If the theme is
procurement-focused and the site is a hyperlocal community platform, find the genuine community
angle rather than forcing the theme. If no direct angle exists, default to the site's most
evergreen content pillar.

Be specific. Generic briefs produce generic content. Return only valid JSON — no markdown fences.`;

async function generateWeeklyBriefs(
  coordinator: CoordinatorData,
  siteId: string,
  researchBrief?: string,
): Promise<SiteBrief[]> {
  const site = SITE_CONFIGS.find(s => s.id === siteId);
  if (!site) throw new Error(`Unknown site: ${siteId}`);

  const sitePlan = coordinator.sites[siteId];
  if (!sitePlan) throw new Error(`No weekly plan set for site: ${siteId}`);

  const userPrompt = `Week commencing: ${coordinator.weekCommencing}
${coordinator.campaignObjective ? `Campaign objective: ${coordinator.campaignObjective}` : ''}

Site: ${site.name} (${site.url})
Audience: ${site.audience}
Tone: ${site.tone}
Primary platform: ${site.primaryPlatform}

This week's content pillar: ${sitePlan.theme}
${sitePlan.notes ? `Additional notes: ${sitePlan.notes}` : ''}
${researchBrief ? `\nThis week's research brief: ${researchBrief}` : ''}

Generate five weekday content briefs (Monday to Friday) for this site. Each should be a distinct
angle on the pillar — no repeated angles, no repeated key points across days.

Return a JSON array with exactly 5 objects, in weekday order. Each object:
{
  "siteId": "${siteId}",
  "dayName": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday",
  "angle": "The specific angle for this day (1-2 sentences — audience-first)",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "cta": "The call to action for this day's post (specific, not generic)",
  "platformNotes": "Any platform-specific guidance for ${site.primaryPlatform}"
}`;

  const raw = await ask(MODEL_GENERATION, COORDINATOR_SYSTEM, userPrompt, 4096);
  const briefs = parseJson<SiteBrief[]>(raw);

  // Validate and normalise
  if (!Array.isArray(briefs) || briefs.length !== 5) {
    throw new Error(`Expected 5 briefs for ${siteId}, got ${Array.isArray(briefs) ? briefs.length : 'non-array'}`);
  }

  return briefs.map((b, i) => ({
    ...b,
    siteId,
    dayName: b.dayName ?? WEEKDAYS[i],
  }));
}

export async function runCoordinator(siteIds?: string[]): Promise<{
  coordinator: CoordinatorData;
  briefs:      SiteBrief[];
}> {
  const coordinator = await getWeeklyPlan();

  // Validate that per-site themes are set
  if (!coordinator.sites || Object.keys(coordinator.sites).length === 0) {
    throw new Error(
      'No weekly plan set. Set this week\'s themes on the /plan page (saved to Supabase) before running the pipeline.'
    );
  }

  const sites = siteIds
    ? SITE_CONFIGS.filter(s => siteIds.includes(s.id))
    : SITE_CONFIGS;

  if (siteIds && sites.length === 0) {
    throw new Error(`No matching site configs for: ${siteIds.join(', ')}`);
  }

  // Research briefs for this week (optional), seeded into each site's prompt.
  const researchBriefs = await getResearchBriefs(coordinator.weekCommencing);

  const allBriefs: SiteBrief[] = [];

  for (const site of sites) {
    if (!coordinator.sites[site.id]) {
      logError(`${site.name} — no theme set in weekly plan, skipping`);
      continue;
    }
    try {
      const briefs = await generateWeeklyBriefs(coordinator, site.id, researchBriefs[site.id]);
      allBriefs.push(...briefs);
      logOk(`${site.name} — 5 briefs generated (Mon–Fri: ${site.primaryPlatform})`);
    } catch (err) {
      logError(`${site.name} — brief generation failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  return { coordinator, briefs: allBriefs };
}
