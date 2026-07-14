#!/usr/bin/env tsx
// ── Main Pipeline Entry Point ─────────────────────────────────────────────────
// Run with: npm run pipeline
// Run for one site: npm run pipeline -- --site masteryourcareerpath
//
// WHEN TO RUN: Saturday or Sunday — so you can review all posts before Monday.
//
// What this does:
//   1. Reads content-coordinator.json for this week's per-site themes
//   2. Lead coordinator generates 5 daily briefs per site (Mon–Fri) — 20 total across 4 sites
//   3. 20 subagents draft content in parallel
//   4. 20 graders score each draft (with auto-retry on fail)
//   5. Approved drafts written to review-queue.json per site (all 5 days)
//   6. Pipeline session saved for dreaming to review on Sunday
//
// This pipeline NEVER creates or schedules posts. It ends at the review queues and
// the content library — approved drafts are reviewed in the dashboard. (Pushing to
// Blotato is an approval-triggered step handled separately, not from here.)
// Set up next week's themes: npm run dev → /plan (do this on Saturday)

import { ReviewQueueFile, ReviewItem, PipelineSession } from './types.js';
import { runCoordinator } from './coordinator.js';
import { runSubagents } from './subagents.js';
import { runGraders } from './grader.js';
import { writeJson, readJson, sitePath, sessionPath, log, logStep, logOk, now, pushSiteDataToSupabase, appendToContentLibrary } from './utils.js';
import { SITE_CONFIGS } from './site-configs.js';

async function run(): Promise<void> {
  const runId = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Parse optional --site flag: npm run pipeline -- --site masteryourcareerpath
  const siteArg     = process.argv.indexOf('--site');
  const targetSites = siteArg !== -1
    ? process.argv.slice(siteArg + 1).filter(a => !a.startsWith('--'))
    : undefined;

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  Command Hub — Content Pipeline');
  log(`  Run: ${runId}`);
  if (targetSites?.length) log(`  Sites: ${targetSites.join(', ')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Step 1: Lead coordinator ─────────────────────────────────────────────────
  const sites     = targetSites ?? SITE_CONFIGS.map(s => s.id);
  const siteCount = sites.length;

  logStep('▶', `Lead coordinator generating ${siteCount * 5} briefs (${siteCount} site${siteCount === 1 ? '' : 's'} × 5 days)…`);
  const { coordinator, briefs } = await runCoordinator(targetSites);
  log(`\n  Week commencing: ${coordinator.weekCommencing}`);
  for (const [siteId, plan] of Object.entries(coordinator.sites)) {
    if (!targetSites || targetSites.includes(siteId)) {
      log(`  ${siteId}: ${plan.theme.split('—')[0].trim()}`);
    }
  }

  // ── Step 2: Subagents (parallel) ────────────────────────────────────────────
  logStep('▶', `Running ${briefs.length} subagents in parallel…`);
  const drafts = await runSubagents(briefs);

  // ── Step 3: Graders ──────────────────────────────────────────────────────────
  logStep('▶', `Running graders (${drafts.length} drafts)…`);
  const graderResults = await runGraders(drafts, briefs);

  // ── Step 4: Write review queues (one file per site, all 5 days) ──────────────
  logStep('▶', 'Writing outputs…');

  const approved = graderResults.filter(r => r.verdict === 'pass');
  const failed   = graderResults.filter(r => r.verdict === 'fail');

  // Group results by site
  const bySite = new Map<string, typeof graderResults>();
  for (const result of graderResults) {
    if (!bySite.has(result.siteId)) bySite.set(result.siteId, []);
    bySite.get(result.siteId)!.push(result);
  }

  for (const [siteId, siteResults] of bySite) {
    const items: ReviewItem[] = siteResults.map(result => ({
      siteId:          result.siteId,
      dayName:         result.dayName,
      platform:        result.draft.platform,
      graderVerdict:   result.verdict === 'pass' ? 'pass' : 'fail',
      retryCount:      result.retryCount,
      failedCriterion: result.failedCriterion,
      contentSnippet:  result.draft.content.slice(0, 100),
      fullContent:     result.draft.content,
      generatedAt:     result.draft.generatedAt,
    }));

    const queue: ReviewQueueFile = {
      generatedAt: now(),
      drafts: items,
    };

    writeJson(sitePath(siteId, 'review-queue.json'), queue);

    // Push to Supabase
    let subagentStatus = null;
    let graderVerdict  = null;
    try { subagentStatus = readJson(sitePath(siteId, 'subagent-status.json')); } catch { /* not written yet */ }
    try { graderVerdict  = readJson(sitePath(siteId, 'grader-verdict.json'));  } catch { /* not written yet */ }
    await pushSiteDataToSupabase(siteId, subagentStatus, graderVerdict, queue);

    // Append to the permanent content library (accumulates every week for repurposing)
    await appendToContentLibrary(siteId, coordinator.weekCommencing, items);

    const sitePass = siteResults.filter(r => r.verdict === 'pass').length;
    logOk(`${siteId} — review-queue.json written (${sitePass}/5 days approved)`);
  }

  // ── Step 5: Save session for dreaming ────────────────────────────────────────
  const session: PipelineSession = {
    runAt:          now(),
    weekCommencing: coordinator.weekCommencing,
    briefs,
    drafts,
    graderResults,
    approved:       approved.length,
    failed:         failed.length,
  };
  writeJson(sessionPath(runId), session);

  // ── Summary ──────────────────────────────────────────────────────────────────
  const totalPosts = siteCount * 5;
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  Batch complete — ${approved.length}/${totalPosts} approved · ${failed.length} failed`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (approved.length > 0) {
    log('  ✓  Approved drafts:');
    for (const r of approved) {
      log(`     ${r.siteId} — ${r.dayName} (${r.draft.platform})`);
    }
  }

  if (failed.length > 0) {
    log('\n  ✗  Failed drafts (need manual review):');
    for (const r of failed) {
      log(`     ${r.siteId} — ${r.dayName}: "${r.failedCriterion}"`);
    }
  }

  log('\n  Next steps:');
  log('  1. Review this week\'s drafts in the dashboard review queue — edit as needed');
  log('  2. Approve the drafts you want to publish (approval handles scheduling separately)');
  log('  3. Push to git: git add -A && git commit -m "pipeline run ' + runId + '" && git push');
  log('  Run on Saturday or Sunday so everything is ready for review before Monday.\n');
}

run().catch(err => {
  console.error('\n  Pipeline failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
