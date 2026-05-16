// ── Lead Coordinator Agent ────────────────────────────────────────────────────
// Reads content-coordinator.json, generates a site-specific brief for each
// of the five sites. Returns an array of SiteBrief objects.

import { CoordinatorData, SiteBrief } from './types.js';
import { SITE_CONFIGS } from './site-configs.js';
import {
  ask, parseJson, readJson, coordinatorPath,
  MODEL_GENERATION, logOk, logError, now,
} from './utils.js';

const COORDINATOR_SYSTEM = `You are the lead content coordinator for a five-site digital portfolio.
Your job is to take a weekly theme and translate it into a precise, actionable content brief
for a specific site's subagent. The brief tells the subagent exactly what angle to take,
what points to cover, and how to connect the theme to that site's audience and products.
Be specific. Generic briefs produce generic content. Return only valid JSON, no markdown fences.`;

async function generateBrief(
  coordinator: CoordinatorData,
  siteId: string,
): Promise<SiteBrief> {
  const site = SITE_CONFIGS.find(s => s.id === siteId);
  if (!site) throw new Error(`Unknown site: ${siteId}`);

  const userPrompt = `Weekly theme: "${coordinator.weeklyTheme}"
Week commencing: ${coordinator.weekCommencing}
${coordinator.campaignObjective ? `Campaign objective: ${coordinator.campaignObjective}` : ''}

Generate a content brief for ${site.name} (${site.url}).
Audience: ${site.audience}
Tone: ${site.tone}
Primary platform: ${site.primaryPlatform}

Return a JSON object with these exact fields:
{
  "siteId": "${siteId}",
  "angle": "The specific angle on this theme for this site's audience (1-2 sentences)",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "cta": "The call to action the post should drive (specific, not generic)",
  "platformNotes": "Any platform-specific guidance for ${site.primaryPlatform}"
}`;

  const raw = await ask(MODEL_GENERATION, COORDINATOR_SYSTEM, userPrompt, 1024);
  const brief = parseJson<SiteBrief>(raw);
  brief.siteId = siteId; // ensure siteId is set correctly
  return brief;
}

export async function runCoordinator(): Promise<{
  coordinator: CoordinatorData;
  briefs: SiteBrief[];
}> {
  const coordinator = readJson<CoordinatorData>(coordinatorPath());

  if (!coordinator.weeklyTheme || coordinator.weeklyTheme.includes('Enter your weekly theme')) {
    throw new Error(
      'No weekly theme set. Edit data/content-coordinator.json and set weeklyTheme before running the pipeline.'
    );
  }

  const briefs: SiteBrief[] = [];

  for (const site of SITE_CONFIGS) {
    try {
      const brief = await generateBrief(coordinator, site.id);
      briefs.push(brief);
      logOk(`${site.name} — brief generated (angle: "${brief.angle.slice(0, 60)}…")`);
    } catch (err) {
      logError(`${site.name} — brief generation failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  return { coordinator, briefs };
}
