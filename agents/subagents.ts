// ── Site Subagents ────────────────────────────────────────────────────────────────────────────
// For automated sites: one draft per platform in blotatoPlatforms.
// For manual sites (didianolue): one draft for the primary platform only.

import { SiteBrief, Draft, SubagentStatusFile } from './types.js';
import { getSiteConfig } from './site-configs.js';
import {
  ask, parseJson, writeJson, sitePath,
  MODEL_GENERATION, logOk, logError, now,
} from './utils.js';

// ── Platform format guidelines injected into every subagent prompt ────────────────────

const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin:  'LinkedIn post: 800–1500 characters. Strong hook in line 1 — make the reader stop scrolling. No hashtags unless naturally relevant. Single clear CTA at the end.',
  instagram: 'Instagram caption: 150–200 words. Hook in line 1. 3–5 relevant hashtags on a new line at the end — maximum 5, no exceptions. (You are writing the caption only — the owner will add the image or reel in Blotato before it publishes.)',
  tiktok:    'TikTok caption/script: max 150 words. The first line IS the scroll-stopper — treat it as the video hook. Write as both caption and script guide. (The owner will attach the video in Blotato before it publishes.)',
  facebook:  'Facebook post: 100–200 words. Conversational, community-first tone. No more than 2 hashtags. Direct and relatable — not corporate.',
  twitter:   'X/Twitter post: max 280 characters. No filler. Every word earns its place.',
};

function platformGuideline(platform: string): string {
  const key = platform.toLowerCase().replace(/x \(twitter\)/, 'twitter').replace(/[^a-z]/g, '');
  return PLATFORM_GUIDELINES[key] ?? `${platform} post: write appropriate content for this platform.`;
}

const SUBAGENT_USER_TEMPLATE = (brief: SiteBrief, platform: string): string => `
Content brief for ${brief.dayName}:
Angle: ${brief.angle}
Key points:
${brief.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
CTA: ${brief.cta}

Platform instructions:
${platformGuideline(platform)}

Write the post now. Follow your system prompt voice exactly.

Return a JSON object with these exact fields:
{
  "platform": "${platform}",
  "content": "The full post text, ready to copy into Blotato"
}

Return only valid JSON. No markdown fences. No explanation outside the JSON.`;

async function draftForPlatform(brief: SiteBrief, platform: string): Promise<Draft> {
  const site = getSiteConfig(brief.siteId);

  const raw = await ask(
    MODEL_GENERATION,
    site.subagentSystemPrompt,
    SUBAGENT_USER_TEMPLATE(brief, platform),
    2048,
  );

  const parsed = parseJson<{ platform: string; content: string }>(raw);

  return {
    siteId:      brief.siteId,
    dayName:     brief.dayName,
    platform:    parsed.platform ?? platform,
    content:     parsed.content,
    generatedAt: now(),
  };
}

async function runSubagent(brief: SiteBrief): Promise<Draft[]> {
  const site = getSiteConfig(brief.siteId);

  // Determine which platforms to draft for
  const platforms = site.automateBlotato && site.blotatoPlatforms.length > 0
    ? site.blotatoPlatforms
    : [site.primaryPlatform];

  const drafts: Draft[] = [];

  for (const platform of platforms) {
    try {
      const draft = await draftForPlatform(brief, platform);
      drafts.push(draft);
      logOk(`${site.id} — ${platform} draft complete`);
    } catch (err) {
      logError(`${site.id} — ${platform} draft failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Write subagent status (one file per site, reflects last run)
  const status: SubagentStatusFile = {
    lastRun:        now(),
    status:         drafts.length > 0 ? 'complete' : 'error',
    briefGenerated: drafts.length > 0,
    briefSummary:   brief.angle.slice(0, 120),
  };
  writeJson(sitePath(brief.siteId, 'subagent-status.json'), status);

  return drafts;
}

export async function runSubagents(briefs: SiteBrief[]): Promise<Draft[]> {
  const results = await Promise.allSettled(
    briefs.map(brief => runSubagent(brief))
  );

  const allDrafts: Draft[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const siteId = briefs[i].siteId;

    if (result.status === 'fulfilled') {
      allDrafts.push(...result.value);
    } else {
      logError(`${siteId} (${briefs[i].dayName}) — subagent failed: ${result.reason}`);

      const errorStatus: SubagentStatusFile = {
        lastRun:        now(),
        status:         'error',
        briefGenerated: false,
        briefSummary:   null,
      };
      writeJson(sitePath(siteId, 'subagent-status.json'), errorStatus);
    }
  }

  if (allDrafts.length === 0) {
    throw new Error('All subagents failed — no drafts to grade');
  }

  return allDrafts;
}
