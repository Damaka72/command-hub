#!/usr/bin/env tsx
// ── Main Pipeline Entry Point ─────────────────────────────────────────────────
// Run with: npm run pipeline
// Run for one site: npm run pipeline -- --site masteryourcareerpath
//
// What this does:
//   1. Reads content-coordinator.json for this week's theme
//   2. Lead coordinator generates site-specific briefs
//   3. Subagents draft content for every Blotato platform per site (in parallel)
//   4. Graders score each draft (with auto-retry on fail)
//   5. Passing drafts scheduled in Blotato 48h from now for your approval
//   6. All results pushed to Supabase for the dashboard
//   7. Pipeline session saved for dreaming to review on Sunday

import { ReviewQueueFile, ReviewItem, PipelineSession } from './types.js';
import { runCoordinator } from './coordinator.js';
import { runSubagents } from './subagents.js';
import { runGraders } from './grader.js';
import { scheduleApprovedDrafts } from './blotato-poster.js';
import { writeJson, readJson, sitePath, sessionPath, log, logStep, logOk, logError, now, pushSiteDataToSupabase } from './utils.js';
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
  const sites      = targetSites ?? SITE_CONFIGS.map(s => s.id);
  const siteCount  = sites.length;
  const draftCount = (targetSites ?? SITE_CONFIGS)
    .reduce((n, id) => {
      const cfg = SITE_CONFIGS.find(s => s.id === (typeof id === 'string' ? id : id));
      return n + (cfg?.automateBlotato ? cfg.blotatoPlatforms.length : 1);
    }, 0);

  logStep('▶', `Lead coordinator generating ${siteCount} site brief${siteCount === 1 ? '' : 's'}…`);
  const { coordinator, briefs } = await runCoordinator(targetSites);
  log(`\n  Theme: "${coordinator.weeklyTheme}"`);

  // ── Step 2: Subagents (one draft per platform per site) ──────────────────────
  logStep('▶', `Running subagents — ${draftCount} draft${draftCount === 1 ? '' : 's'} across ${siteCount} site${siteCount === 1 ? '' : 's'}…`);
  const drafts = await runSubagents(briefs);

  // ── Step 3: Graders ──────────────────────────────────────────────────────────
  logStep('▶', `Grading ${drafts.length} draft${drafts.length === 1 ? '' : 's'}…`);
  const graderResults = await runGraders(drafts, briefs);

  const approved = graderResults.filter(r => r.verdict === 'pass');
  const failed   = graderResults.filter(r => r.verdict === 'fail');

  // ── Step 4: Schedule in Blotato ──────────────────────────────────────────────
  logStep('▶', 'Scheduling approved drafts in Blotato (48h window for your review)…');
  const automatedResults = approved.filter(r => {
    const cfg = SITE_CONFIGS.find(s => s.id === r.siteId);
    return cfg?.automateBlotato ?? false;
  });
  await scheduleApprovedDrafts(automatedResults);

  // ── Step 5: Write review queues + push to Supabase ───────────────────────────
  logStep('▶', 'Writing outputs to Supabase…');

  // Group results by site so we write one review-queue.json per site
  const bySite = new Map<string, typeof graderResults>();
  for (const r of graderResults) {
    if (!bySite.has(r.siteId)) bySite.set(r.siteId, []);
    bySite.get(r.siteId)!.push(r);
  }

  for (const [siteId, results] of bySite) {
    const items: ReviewItem[] = results.map(r => ({
      siteId:          r.siteId,
      platform:        r.draft.platform,
      graderVerdict:   r.verdict === 'pass' ? 'pass' : 'fail',
      retryCount:      r.retryCount,
      failedCriterion: r.failedCriterion,
      contentSnippet:  r.draft.content.slice(0, 100),
      fullContent:     r.draft.content,
      generatedAt:     r.draft.generatedAt,
    }));

    const queue: ReviewQueueFile = { generatedAt: now(), drafts: items };
    writeJson(sitePath(siteId, 'review-queue.json'), queue);

    let subagentStatus = null;
    let graderVerdict  = null;
    try { subagentStatus = readJson(sitePath(siteId, 'subagent-status.json')); } catch { /* ok */ }
    try { graderVerdict  = readJson(sitePath(siteId, 'grader-verdict.json'));  } catch { /* ok */ }
    await pushSiteDataToSupabase(siteId, subagentStatus, graderVerdict, queue);

    logOk(`${siteId} — ${items.length} draft${items.length === 1 ? '' : 's'} written`);
  }

  // ── Step 6: Save session for dreaming ────────────────────────────────────────
  const session: PipelineSession = {
    runAt:       now(),
    weeklyTheme: coordinator.weeklyTheme,
    briefs,
    drafts,
    graderResults,
    approved:    approved.length,
    failed:      failed.length,
  };
  writeJson(sessionPath(runId), session);

  // ── Summary ──────────────────────────────────────────────────────────────────
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  Batch complete — ${approved.length}/${drafts.length} approved · ${failed.length} failed`);
  log(`  ${automatedResults.length} scheduled in Blotato (48h window)`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (approved.length > 0) {
    log('  ✓  Approved:');
    for (const r of approved) log(`     ${r.siteId} · ${r.draft.platform}`);
  }

  if (failed.length > 0) {
    log('\n  ✗  Failed (check dashboard):');
    for (const r of failed) log(`     ${r.siteId} · ${r.draft.platform} — "${r.failedCriterion}"`);
  }

  log('\n  Next: open Blotato, add media to Instagram/TikTok posts, approve to publish.\n');
}

run().catch(err => {
  console.error('\n  Pipeline failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
