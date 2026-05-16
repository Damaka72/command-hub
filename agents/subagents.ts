// ── Site Subagents ────────────────────────────────────────────────────────────
// Five subagents run in parallel. Each receives its site brief and drafts
// content for its primary platform. Returns an array of Draft objects.

import { SiteBrief, Draft, SubagentStatusFile } from './types.js';
import { getSiteConfig } from './site-configs.js';
import {
  ask, parseJson, writeJson, sitePath,
  MODEL_GENERATION, logOk, logError, now,
} from './utils.js';

const SUBAGENT_USER_TEMPLATE = (brief: SiteBrief, platform: string): string => `
Content brief for this week:
Angle: ${brief.angle}
Key points:
${brief.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
CTA: ${brief.cta}
Platform notes: ${brief.platformNotes}

Write a ${platform} post based on this brief.
Follow your system prompt instructions exactly.

Return a JSON object with these exact fields:
{
  "platform": "${platform}",
  "content": "The full post text, ready to copy into Blotato"
}

Return only valid JSON. No markdown fences. No explanation outside the JSON.`;

async function runSubagent(brief: SiteBrief): Promise<Draft> {
  const site = getSiteConfig(brief.siteId);

  const raw = await ask(
    MODEL_GENERATION,
    site.subagentSystemPrompt,
    SUBAGENT_USER_TEMPLATE(brief, site.primaryPlatform),
    2048,
  );

  const parsed = parseJson<{ platform: string; content: string }>(raw);

  const draft: Draft = {
    siteId: brief.siteId,
    platform: parsed.platform ?? site.primaryPlatform,
    content: parsed.content,
    generatedAt: now(),
  };

  // Write subagent status file
  const status: SubagentStatusFile = {
    lastRun: now(),
    status: 'complete',
    briefGenerated: true,
    briefSummary: brief.angle.slice(0, 120),
  };
  writeJson(sitePath(brief.siteId, 'subagent-status.json'), status);

  return draft;
}

export async function runSubagents(briefs: SiteBrief[]): Promise<Draft[]> {
  // Run all five subagents in parallel
  const results = await Promise.allSettled(
    briefs.map(brief => runSubagent(brief))
  );

  const drafts: Draft[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const siteId = briefs[i].siteId;

    if (result.status === 'fulfilled') {
      drafts.push(result.value);
      logOk(`${siteId} — draft complete (${result.value.platform})`);
    } else {
      logError(`${siteId} — subagent failed: ${result.reason}`);

      // Write error status
      const errorStatus: SubagentStatusFile = {
        lastRun: now(),
        status: 'error',
        briefGenerated: false,
        briefSummary: null,
      };
      writeJson(sitePath(siteId, 'subagent-status.json'), errorStatus);
    }
  }

  if (drafts.length === 0) {
    throw new Error('All subagents failed — no drafts to grade');
  }

  return drafts;
}
