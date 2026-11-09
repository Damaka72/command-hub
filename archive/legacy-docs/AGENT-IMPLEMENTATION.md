# Agent System — Setup and Verification

The agent TypeScript files are already written (agents/ folder). This spec covers the three
remaining steps: installing dependencies, updating the API route to read local data files,
and doing a first test run.

Work through the tasks in order. Stop and report after each one.

---

## Ground rules

- Run `npm run build` after Task 2 to check TypeScript compiles cleanly.
- Do not change the agent files in agents/ — they are already written and correct.
- Only touch the files listed in each task.

---

## Task 0 — Add ANTHROPIC_API_KEY to .env.local

Check whether `.env.local` exists. If it does not, create it. Ensure it contains:

```
ANTHROPIC_API_KEY=your-key-here
```

Do not overwrite any other keys already in the file. Do not commit this file to git
(it is already in .gitignore).

Report: confirm .env.local exists and contains ANTHROPIC_API_KEY.

---

## Task 1 — Install dependencies

Run:

```bash
npm install
```

The package.json already has `@anthropic-ai/sdk`, `dotenv`, and `tsx` added. This task
just installs them.

Report: confirm `node_modules/@anthropic-ai` exists after install.

---

## Task 2 — Update the API route to read from local data files

**File to change:** `app/api/status/route.ts`

The dashboard currently reads agent data by fetching JSON from live site URLs. With the agent
system writing to `data/sites/{siteId}/` locally, we need the API to read those files instead.

### Step 2a — Add fs import at the top of the file

Add to the top of `app/api/status/route.ts`, after the existing import:

```typescript
import fs from 'fs';
import path from 'path';
```

### Step 2b — Add a local data reader helper

Add this function after the existing helper functions (after the `safeFetch` function):

```typescript
function readLocalJson<T>(filePath: string): T | null {
  try {
    const full = path.join(process.cwd(), filePath);
    if (!fs.existsSync(full)) return null;
    return JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
  } catch {
    return null;
  }
}
```

### Step 2c — Replace fetchSubagentStatus

Replace the existing `fetchSubagentStatus` function with this version that reads locally first,
falls back to network:

```typescript
async function fetchSubagentStatus(siteUrl: string, siteId: string): Promise<SubagentStatus | null> {
  // Try local data directory first (written by npm run pipeline)
  const local = readLocalJson<SubagentStatus>(`data/sites/${siteId}/subagent-status.json`);
  if (local) return local;
  // Fall back to network fetch (for external sites)
  const data = await safeFetch(`${siteUrl}/data/agent-summaries/subagent-status.json`);
  if (!data) return null;
  return {
    lastRun:        (data.lastRun        as string)  ?? null,
    status:         (data.status         as SubagentStatus['status']) ?? 'never_run',
    briefGenerated: !!(data.briefGenerated),
    briefSummary:   (data.briefSummary   as string)  ?? null,
  };
}
```

### Step 2d — Replace fetchGraderVerdict

Replace the existing `fetchGraderVerdict` function:

```typescript
async function fetchGraderVerdict(siteUrl: string, siteId: string): Promise<GraderVerdict | null> {
  // Try local data directory first
  const local = readLocalJson<GraderVerdict>(`data/sites/${siteId}/grader-verdict.json`);
  if (local) return local;
  // Fall back to network fetch
  const data = await safeFetch(`${siteUrl}/data/agent-summaries/grader-verdict.json`);
  if (!data) return null;
  return {
    rubricName:      SITE_RUBRIC_NAMES[siteId] ?? 'Outcomes rubric',
    verdict:         (data.verdict         as GraderVerdict['verdict']) ?? 'never_run',
    retryCount:      typeof data.retryCount === 'number' ? data.retryCount : 0,
    failedCriterion: (data.failedCriterion as string) ?? null,
    lastRun:         (data.lastRun         as string) ?? null,
  };
}
```

### Step 2e — Replace fetchReviewQueue

Replace the existing `fetchReviewQueue` function:

```typescript
async function fetchReviewQueue(): Promise<DraftItem[]> {
  const siteIds = ['didianolue', 'masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];
  const allItems: DraftItem[] = [];

  for (const siteId of siteIds) {
    // Try local first
    const local = readLocalJson<{ drafts: DraftItem[] }>(`data/sites/${siteId}/review-queue.json`);
    if (local?.drafts) {
      allItems.push(...local.drafts);
      continue;
    }
    // Fall back to network
    const site = SITES.find(s => s.id === siteId);
    if (!site) continue;
    const data = await safeFetch(`${site.url}/data/agent-summaries/review-queue.json`);
    if (!data || !Array.isArray(data.drafts)) continue;
    allItems.push(...(data.drafts as DraftItem[]));
  }

  return allItems;
}
```

### Done condition for Task 2

`npm run build` passes with zero TypeScript errors.

---

## Task 3 — First test run

### Step 3a — Set the weekly theme

Edit `data/content-coordinator.json`. Change `weeklyTheme` from the placeholder to a real
test theme — use: `"Delivering value in complex procurement"`. Update `weekCommencing` to
today's date. Save the file.

### Step 3b — Run the pipeline

```bash
npm run pipeline
```

Watch the output. You should see:
- Lead coordinator generating 5 briefs
- 5 subagents completing in parallel
- Graders running per site (pass / retry / fail)
- Outputs written to data/sites/

If any step errors, report the exact error message.

### Step 3c — Verify output files

Confirm these files now exist:

```
data/sites/didianolue/subagent-status.json
data/sites/didianolue/grader-verdict.json
data/sites/didianolue/review-queue.json
data/sites/masteryourcareerpath/review-queue.json
data/sites/theconcurrentcontractor/review-queue.json
data/sites/oldoaktown/review-queue.json
data/sites/aiviralvideoprompts/review-queue.json
data/sessions/[today's date].json
```

### Step 3d — Read one draft

Open `data/sites/didianolue/review-queue.json` and show the first draft's `fullContent` field.
This is the first post the agent system has produced.

### Done condition for Task 3

Pipeline ran to completion. Output files exist. At least one draft visible in review-queue.json.
Report the full terminal output and the Didi Anolue draft content.

---

## Final checklist

- [ ] .env.local contains ANTHROPIC_API_KEY
- [ ] npm install completed, @anthropic-ai/sdk in node_modules
- [ ] npm run build passes
- [ ] npm run pipeline ran successfully
- [ ] data/sites/ folder populated with JSON files
- [ ] At least one draft visible in a review-queue.json
