#!/usr/bin/env tsx
// ── Main Pipeline Entry Point ─────────────────────────────────────────────────
// Run with: npm run pipeline
//
// What this does:
//   1. Reads content-coordinator.json for this week's theme
//   2. Lead coordinator generates 5 site-specific briefs
//   3. 5 subagents draft content in parallel
//   4. 5 graders score each draft (with auto-retry on fail)
//   5. Approved drafts written to review-queue.json per site
//   6. Pipeline session saved for dreaming to review on Sunday
//
// After this runs, push to git: the dashboard will show the results.

import { ReviewQueueFile, ReviewItem, PipelineSession } from './types.js';
import { runCoordinator } from './coordinator.js';
import { runSubagents } from './subagents.js';
import { runGraders } from './grader.js';
import { writeJson, readJson, sitePath, sessionPath, log, logStep, logOk, logError, now, pushSiteDataToSupabase } from './utils.js';

async function run(): Promise<void> {
  const runId = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  Command Hub — Content Pipeline');
  log(`  Run: ${runId}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Lead coordinator ─────────────────────────────────────────────────
  logStep('▶', 'Lead coordinator generating 5 site briefs…');
  const { coordinator, briefs } = await runCoordinator();
  log(`\n  Theme: "${coordinator.weeklyTheme}"`);

  // ── Step 2: Five subagents ───────────────────────────────────────────────────
  logStep('▶', 'Running 5 subagents in parallel…');
  const drafts = await runSubagents(briefs);

  // ── Step 3: Five graders ─────────────────────────────────────────────────────
  logStep('▶', 'Running graders…');
  const graderResults = await runGraders(drafts, briefs);

  // ── Step 4: Write review queues ──────────────────────────────────────────────
  logStep('▶', 'Writing outputs…');

  const approved = graderResults.filter(r => r.verdict === 'pass');
  const failed   = graderResults.filter(r => r.verdict === 'fail');

  for (const result of graderResults) {
    const item: ReviewItem = {
      siteId:          result.siteId,
      platform:        result.draft.platform,
      graderVerdict:   result.verdict === 'pass' ? 'pass' : 'fail',
      retryCount:      result.retryCount,
      failedCriterion: result.failedCriterion,
      contentSnippet:  result.draft.content.slice(0, 100),
      fullContent:     result.draft.content,
      generatedAt:     result.draft.generatedAt,
    };

    const queue: ReviewQueueFile = {
      generatedAt: now(),
      drafts: [item],
    };

    writeJson(sitePath(result.siteId, 'review-queue.json'), queue);

    // Push to Supabase so the live dashboard can read it
    let subagentStatus = null;
    let graderVerdict  = null;
    try { subagentStatus = readJson(sitePath(result.siteId, 'subagent-status.json')); } catch { /* not written yet */ }
    try { graderVerdict  = readJson(sitePath(result.siteId, 'grader-verdict.json'));  } catch { /* not written yet */ }
    await pushSiteDataToSupabase(result.siteId, subagentStatus, graderVerdict, queue);

    logOk(`${result.siteId} — review-queue.json written`);
  }

  // ── Step 5: Save session for dreaming ────────────────────────────────────────
  const session: PipelineSession = {
    runAt:         now(),
    weeklyTheme:   coordinator.weeklyTheme,
    briefs,
    drafts,
    graderResults,
    approved:      approved.length,
    failed:        failed.length,
  };
  writeJson(sessionPath(runId), session);

  // ── Summary ──────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  Batch complete — ${approved.length}/5 approved · ${failed.length} failed`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (approved.length > 0) {
    log('  ✓  Approved drafts:');
    for (const r of approved) {
      log(`     ${r.siteId} (${r.draft.platform})`);
    }
  }

  if (failed.length > 0) {
    log('\n  ✗  Failed drafts (need manual review):');
    for (const r of failed) {
      log(`     ${r.siteId} — "${r.failedCriterion}"`);
    }
  }

  log('\n  Next step: review drafts in the dashboard, then push to git.');
  log('  git add -A && git commit -m "pipeline run ' + runId + '" && git push\n');
}

run().catch(err => {
  console.error('\n  Pipeline failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
