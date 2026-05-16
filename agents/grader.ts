// ── Outcomes Grader ───────────────────────────────────────────────────────────
// Each draft is assessed against its site's rubric. Fails are retried up to
// MAX_RETRIES times. Returns a GraderResult for each draft.

import { Draft, GraderResult, GraderVerdictFile, SubagentStatusFile, SiteBrief } from './types.js';
import { getSiteConfig } from './site-configs.js';
import {
  ask, parseJson, writeJson, sitePath,
  MODEL_GENERATION, MODEL_GRADING, logOk, logWarn, logError, now,
} from './utils.js';

const MAX_RETRIES = 3;

const GRADER_SYSTEM = `You are a content quality grader. Your job is to assess a social media post
strictly against a provided rubric. You are thorough, consistent, and do not give the benefit
of the doubt. If a criterion is not clearly met, the draft fails.
Return only valid JSON with no markdown fences or explanation.`;

const GRADER_USER = (
  siteName: string,
  rubricName: string,
  passChecks: string[],
  failCheck: string,
  content: string,
): string => `
Rubric: ${rubricName} for ${siteName}

Pass criteria (ALL must be met):
${passChecks.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Automatic fail condition:
- ${failCheck}

Post to assess:
"""
${content}
"""

Return a JSON object:
{
  "verdict": "pass" or "fail",
  "failedCriterion": null if pass, or the exact criterion text that failed,
  "explanation": "One sentence explaining the verdict"
}`;

const RETRY_SYSTEM = (siteConfig: ReturnType<typeof getSiteConfig>): string =>
  siteConfig.subagentSystemPrompt;

const RETRY_USER = (
  brief: SiteBrief,
  platform: string,
  failedCriterion: string,
  previousContent: string,
): string => `
Your previous draft failed grading.

Failed criterion: "${failedCriterion}"

Previous draft:
"""
${previousContent}
"""

Content brief:
Angle: ${brief.angle}
Key points:
${brief.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
CTA: ${brief.cta}

Rewrite the ${platform} post to specifically address the failed criterion.
All other requirements remain the same.

Return JSON:
{
  "platform": "${platform}",
  "content": "The revised post text"
}`;

async function gradeOnce(draft: Draft): Promise<{
  verdict: 'pass' | 'fail';
  failedCriterion: string | null;
}> {
  const site = getSiteConfig(draft.siteId);

  const raw = await ask(
    MODEL_GRADING,
    GRADER_SYSTEM,
    GRADER_USER(
      site.name,
      site.rubricName,
      site.passChecks,
      site.failCheck,
      draft.content,
    ),
    256,
  );

  const result = parseJson<{
    verdict: 'pass' | 'fail';
    failedCriterion: string | null;
  }>(raw);

  return result;
}

async function rewriteDraft(
  draft: Draft,
  brief: SiteBrief,
  failedCriterion: string,
): Promise<Draft> {
  const site = getSiteConfig(draft.siteId);

  const raw = await ask(
    MODEL_GENERATION,
    RETRY_SYSTEM(site),
    RETRY_USER(brief, draft.platform, failedCriterion, draft.content),
    2048,
  );

  const parsed = parseJson<{ platform: string; content: string }>(raw);

  return {
    siteId: draft.siteId,
    platform: parsed.platform ?? draft.platform,
    content: parsed.content,
    generatedAt: now(),
  };
}

async function gradeWithRetry(
  draft: Draft,
  brief: SiteBrief,
): Promise<GraderResult> {
  const site = getSiteConfig(draft.siteId);
  let current = draft;
  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    const { verdict, failedCriterion } = await gradeOnce(current);

    if (verdict === 'pass') {
      const verdictFile: GraderVerdictFile = {
        rubricName: site.rubricName,
        verdict: 'pass',
        retryCount,
        failedCriterion: null,
        lastRun: now(),
      };
      writeJson(sitePath(draft.siteId, 'grader-verdict.json'), verdictFile);

      return {
        siteId: draft.siteId,
        rubricName: site.rubricName,
        verdict: 'pass',
        retryCount,
        failedCriterion: null,
        draft: current,
      };
    }

    // Failed
    if (retryCount < MAX_RETRIES) {
      logWarn(`${draft.siteId} — fail (retry ${retryCount + 1}/${MAX_RETRIES}): "${failedCriterion}"`);
      current = await rewriteDraft(current, brief, failedCriterion!);
      retryCount++;
    } else {
      // Exhausted retries
      const verdictFile: GraderVerdictFile = {
        rubricName: site.rubricName,
        verdict: 'fail',
        retryCount,
        failedCriterion,
        lastRun: now(),
      };
      writeJson(sitePath(draft.siteId, 'grader-verdict.json'), verdictFile);

      return {
        siteId: draft.siteId,
        rubricName: site.rubricName,
        verdict: 'fail',
        retryCount,
        failedCriterion,
        draft: current,
      };
    }
  }

  // Should not reach here
  throw new Error(`Grader loop exceeded for ${draft.siteId}`);
}

export async function runGraders(
  drafts: Draft[],
  briefs: SiteBrief[],
): Promise<GraderResult[]> {
  const results: GraderResult[] = [];

  // Grade sequentially to avoid rate limits
  for (const draft of drafts) {
    const brief = briefs.find(b => b.siteId === draft.siteId);
    if (!brief) {
      logError(`${draft.siteId} — no brief found, skipping grader`);
      continue;
    }

    try {
      const result = await gradeWithRetry(draft, brief);
      results.push(result);

      if (result.verdict === 'pass') {
        logOk(`${draft.siteId} — PASS (${result.rubricName})${result.retryCount > 0 ? ` after ${result.retryCount} retr${result.retryCount === 1 ? 'y' : 'ies'}` : ''}`);
      } else {
        logError(`${draft.siteId} — FAIL after ${result.retryCount} retries: "${result.failedCriterion}"`);
      }
    } catch (err) {
      logError(`${draft.siteId} — grader threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return results;
}
