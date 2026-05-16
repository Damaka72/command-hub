#!/usr/bin/env tsx
// ── Dreaming Process ──────────────────────────────────────────────────────────
// Run with: npm run dreaming   (recommended: Sunday nights)
//
// Reviews completed pipeline sessions, extracts what worked and what did not,
// and writes a dreaming-status.json that feeds back into next week's pipeline.

import fs from 'fs';
import path from 'path';
import { PipelineSession, DreamingStatusFile } from './types.js';
import {
  ask, parseJson, readJson, writeJson, dreamingPath, sessionPath,
  MODEL_GENERATION, log, logStep, logOk, now, nextSunday,
} from './utils.js';

const DREAMING_SYSTEM = `You are the dreaming process for a multiagent content pipeline.
Each week, five subagents draft content for five different websites. Each draft is graded
against a site-specific rubric. Your job is to review the week's session data, extract
patterns — what angles worked, what caused failures, what retry patterns appeared — and
produce concise improvement notes that will make next week's pipeline sharper.
Return only valid JSON with no markdown fences.`;

function buildDreamingPrompt(sessions: PipelineSession[]): string {
  const sessionSummaries = sessions.map(s => ({
    runAt:       s.runAt,
    theme:       s.weeklyTheme,
    approved:    s.approved,
    failed:      s.failed,
    results:     s.graderResults.map(r => ({
      site:            r.siteId,
      verdict:         r.verdict,
      retries:         r.retryCount,
      failedCriterion: r.failedCriterion,
      contentSnippet:  r.draft.content.slice(0, 200),
    })),
  }));

  return `Review the following pipeline session data from the past week:

${JSON.stringify(sessionSummaries, null, 2)}

Identify:
1. Patterns in what passed vs. what failed (by site and rubric)
2. Common failure modes across sites
3. Specific improvements for each site's subagent prompt or briefing
4. Recommended adjustments for the coordinator's briefing approach

Return a JSON object:
{
  "patternsExtracted": [
    "Short pattern description 1",
    "Short pattern description 2"
  ],
  "agentImprovements": {
    "didianolue": "One sentence on how to improve this site's drafts",
    "masteryourcareerpath": "...",
    "theconcurrentcontractor": "...",
    "oldoaktown": "...",
    "aiviralvideoprompts": "..."
  },
  "coordinatorNote": "One sentence on how the coordinator should adjust briefs next week",
  "memoryUpdates": 5
}`;
}

function loadRecentSessions(): PipelineSession[] {
  const sessionsDir = path.join(process.cwd(), 'data', 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];

  const files = fs.readdirSync(sessionsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .slice(-7); // last 7 sessions at most

  return files
    .map(f => {
      try {
        return readJson<PipelineSession>(path.join(sessionsDir, f));
      } catch {
        return null;
      }
    })
    .filter((s): s is PipelineSession => s !== null);
}

async function run(): Promise<void> {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  Command Hub — Dreaming Process');
  log(`  Run: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  logStep('▶', 'Loading recent pipeline sessions…');
  const sessions = loadRecentSessions();

  if (sessions.length === 0) {
    log('  No sessions found. Run npm run pipeline at least once first.\n');
    process.exit(0);
  }

  log(`  Found ${sessions.length} session(s) to review.`);

  logStep('▶', 'Extracting patterns…');
  const raw = await ask(
    MODEL_GENERATION,
    DREAMING_SYSTEM,
    buildDreamingPrompt(sessions),
    1024,
  );

  const result = parseJson<{
    patternsExtracted: string[];
    agentImprovements: Record<string, string>;
    coordinatorNote: string;
    memoryUpdates: number;
  }>(raw);

  const status: DreamingStatusFile = {
    lastRun:           now(),
    nextRun:           nextSunday(),
    mode:              'auto-update',
    memoryUpdates:     result.memoryUpdates,
    patternsExtracted: result.patternsExtracted,
  };

  writeJson(dreamingPath(), status);
  logOk('dreaming-status.json written');

  // Print the improvement notes
  log('\n  Patterns extracted:');
  for (const p of result.patternsExtracted) {
    log(`    · ${p}`);
  }

  log('\n  Agent improvement notes:');
  for (const [siteId, note] of Object.entries(result.agentImprovements)) {
    log(`    ${siteId}: ${note}`);
  }

  log(`\n  Coordinator note: ${result.coordinatorNote}`);

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  Dreaming complete — ${result.memoryUpdates} memory updates`);
  log('  Next run: ' + nextSunday().slice(0, 10));
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  log('  Next step: push to git to update the dashboard.');
  log('  git add -A && git commit -m "dreaming run" && git push\n');
}

run().catch(err => {
  console.error('\n  Dreaming failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
