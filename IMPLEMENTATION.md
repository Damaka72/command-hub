# Command Hub — Multiagent Architecture Implementation

## What this file is

This is a sequenced implementation spec for adding multiagent content pipeline monitoring to the
Command Hub dashboard. Work through the tasks in order. Each task is self-contained and has a
clear done condition. Do not begin the next task until the current one builds cleanly and you have
confirmed the outcome.

---

## Ground rules

- Run `npm run build` after every task. Fix any TypeScript errors before proceeding.
- Only touch the files listed in each task. Do not refactor unrelated code.
- Do not add placeholder/mock data — all new fields should default to `null` if no real data is
  available, and the UI should render a clean empty state.
- All new components use the existing Tailwind dark-mode pattern (`dark:` variants) already
  present in the codebase.
- Do not remove or rename the existing `coordinator` field on `SiteDetail` — it is consumed in
  multiple places and must remain backward-compatible.

---

## Architectural note — content-coordinator.json

The existing `fetchCoordinator()` in `app/api/status/route.ts` reads
`{siteUrl}/data/content-coordinator.json` **per site**. The new multiagent architecture has a
**single lead coordinator** that generates one central brief which fans out to all five subagents.

Resolution: add a new `portfolioCoordinator` field to the API response (top-level, not per-site)
that reads from a single canonical source — `didianolue.co.uk/data/content-coordinator.json`.
The existing per-site `coordinator` field stays untouched for backward compatibility.

---

## Task 0 — Extend the data model

**Files to change:** `app/api/status/route.ts`

### Step 0a — Add new exported types

Add the following interfaces alongside the existing exported types. Place them after the existing
`CoordinatorData` interface:

```typescript
export interface SubagentStatus {
  lastRun: string | null;       // ISO timestamp or null
  status: 'idle' | 'running' | 'complete' | 'error' | 'never_run';
  briefGenerated: boolean;
  briefSummary: string | null;  // first 120 chars of the generated brief, or null
}

export interface GraderVerdict {
  rubricName: string;           // e.g. "Authority rubric", "No-fabrication rubric"
  verdict: 'pass' | 'fail' | 'retry' | 'never_run';
  retryCount: number;
  failedCriterion: string | null;  // the specific failing criterion text, or null
  lastRun: string | null;
}

export interface PortfolioCoordinator {
  lastRun: string | null;
  sourceFile: string;            // always "content-coordinator.json"
  weeklyTheme: string | null;
  weekCommencing: string | null;
  campaignObjective: string | null;
  batchStatus: {
    approved: number;
    pending: number;
    failed: number;
    readyForReview: boolean;     // true when all subagents have reported back
  };
}

export interface DraftItem {
  siteId: string;
  platform: string;             // e.g. "LinkedIn", "Instagram"
  graderVerdict: 'pass' | 'fail' | 'retry';
  retryCount: number;
  failedCriterion: string | null;
  contentSnippet: string | null; // first 100 chars of the draft, or null
}
```

### Step 0b — Extend SiteDetail

Add these two fields to the `SiteDetail` interface:

```typescript
subagentStatus: SubagentStatus | null;
graderVerdict: GraderVerdict | null;
```

### Step 0c — Add portfolio-level types to the GET response

The current GET handler returns `Record<string, SiteDetail>`. Wrap this in a new top-level shape:

```typescript
export interface StatusResponse {
  sites: Record<string, SiteDetail>;
  portfolioCoordinator: PortfolioCoordinator | null;
  reviewQueue: DraftItem[];     // drafts awaiting Didi's review before publish
}
```

Update the GET handler's return value to `StatusResponse`. The `sites` key contains what was
previously the entire response. This is a breaking change — update all consumers in the same task:

- `app/page.tsx` — change `statusMap` type from `Record<string, SiteDetail>` to `StatusResponse`,
  update all `statusMap[site.id]` references to `statusMap.sites[site.id]`, and thread
  `portfolioCoordinator` and `reviewQueue` through as props where needed.
- `app/components/DailyBriefing.tsx` — update the `statusMap` prop type to
  `Record<string, SiteDetail>` (pass `statusResponse.sites` from the parent, not the full response).

### Step 0d — Add data-fetching functions

Add the following fetch functions. Each reads from a JSON file on the relevant site. Return `null`
on any failure — never throw.

```typescript
// Rubric names per site — used by the grader verdict display
const SITE_RUBRIC_NAMES: Record<string, string> = {
  didianolue:              'Authority rubric',
  masteryourcareerpath:    'PRIME/OPERATE rubric',
  theconcurrentcontractor: 'Contractor lens rubric',
  oldoaktown:              'No-fabrication rubric',
  aiviralvideoprompts:     'Conversion rubric',
};

async function fetchSubagentStatus(siteUrl: string): Promise<SubagentStatus | null> {
  const data = await safeFetch(`${siteUrl}/data/agent-summaries/subagent-status.json`);
  if (!data) return null;
  return {
    lastRun:        (data.lastRun        as string)  ?? null,
    status:         (data.status         as SubagentStatus['status']) ?? 'never_run',
    briefGenerated: !!(data.briefGenerated),
    briefSummary:   (data.briefSummary   as string)  ?? null,
  };
}

async function fetchGraderVerdict(siteUrl: string, siteId: string): Promise<GraderVerdict | null> {
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

async function fetchPortfolioCoordinator(): Promise<PortfolioCoordinator | null> {
  // Single canonical source — the lead coordinator writes here
  const data = await safeFetch('https://didianolue.co.uk/data/content-coordinator.json');
  if (!data) return null;
  const approved = typeof data.approved === 'number' ? data.approved : 0;
  const pending  = typeof data.pending  === 'number' ? data.pending  : 0;
  const failed   = typeof data.failed   === 'number' ? data.failed   : 0;
  return {
    lastRun:          (data.setAt          as string) ?? null,
    sourceFile:       'content-coordinator.json',
    weeklyTheme:      (data.weeklyTheme    as string) ?? null,
    weekCommencing:   (data.weekCommencing as string) ?? null,
    campaignObjective:(data.campaignObjective as string) ?? null,
    batchStatus: { approved, pending, failed, readyForReview: pending === 0 && approved > 0 },
  };
}

async function fetchReviewQueue(): Promise<DraftItem[]> {
  // Each site exposes its pending draft at /data/agent-summaries/review-queue.json
  // Collect from all five and merge
  const results = await Promise.all(
    SITES.map(async (site): Promise<DraftItem[]> => {
      const data = await safeFetch(`${site.url}/data/agent-summaries/review-queue.json`);
      if (!data || !Array.isArray(data.drafts)) return [];
      return (data.drafts as Array<Record<string, unknown>>).map(d => ({
        siteId:          site.id,
        platform:        (d.platform        as string) ?? 'Unknown',
        graderVerdict:   (d.graderVerdict   as DraftItem['graderVerdict']) ?? 'fail',
        retryCount:      typeof d.retryCount === 'number' ? d.retryCount : 0,
        failedCriterion: (d.failedCriterion as string) ?? null,
        contentSnippet:  (d.contentSnippet  as string) ?? null,
      }));
    })
  );
  return results.flat();
}
```

### Step 0e — Wire new fetches into the GET handler

In the existing `GET()` function:

1. Add `fetchPortfolioCoordinator` and `fetchReviewQueue` to the parallel
   fetch block at the top of the handler (alongside `fetchBlotatoScheduledCounts`).
2. Inside each site's `Promise.all`, add `fetchSubagentStatus(site.url)` and
   `fetchGraderVerdict(site.url, site.id)`.
3. Include `subagentStatus` and `graderVerdict` in the returned `SiteDetail`.
4. Return the new `StatusResponse` shape from the handler.

### Done condition for Task 0

`npm run build` passes with no TypeScript errors. The `/api/status` endpoint returns the new shape
with `sites`, `portfolioCoordinator`, and `reviewQueue` at the top level. All new
fields default to `null` / empty array when the JSON files do not yet exist on the sites.

---

## Task 1 — Agent Command Centre (new top-level component)

**Files to create:** `app/components/AgentCommandCentre.tsx`
**Files to change:** `app/page.tsx`

### What it shows

A full-width panel inserted in `page.tsx` between the `<PortfolioBar>` and the `<main>` grid.

Layout:
```
[ Lead Coordinator ]   [ Subagent + Grader status — 5 columns ]   [ Batch status ]
```

### Lead Coordinator block (left, ~25% width)

- Label: `LEAD COORDINATOR`
- Row: `content-coordinator.json` in monospace, small, zinc-400
- Row: Last run — use `portfolioCoordinator.lastRun`, formatted as relative time (e.g. "3h ago").
  Show `—` if null.
- Row: Weekly theme — `portfolioCoordinator.weeklyTheme`. Show `Not set` in zinc-400 if null.
- Row: Campaign objective — `portfolioCoordinator.campaignObjective`. Truncate to 60 chars.

### Five-column subagent strip (centre, ~50% width)

One column per site in this order: Didi · MYCP · TCC · OOT · AIVVP.

Each column shows:
- Site abbreviation as a small bold label (use the existing `SITE_SHORT` map from DailyBriefing —
  extract this to a shared constant rather than duplicating it).
- Subagent status pill: `idle` → zinc, `running` → amber + pulse, `complete` → emerald,
  `error` → red, `never_run` → zinc-300. Show the status text inside the pill.
- Grader verdict pill immediately below: `pass` → emerald, `fail` → red, `retry` → amber.
  If `retryCount > 0`, append `(×N)`. Show `—` if verdict is `never_run`.
- Rubric name in zinc-400 text below the verdict pill (e.g. "Authority rubric").

### Batch status block (right, ~25% width)

Three counters in a row: `Approved N`, `Pending N`, `Failed N` — styled emerald / zinc / red
respectively, bold numbers.

If `portfolioCoordinator.batchStatus.readyForReview` is true, show a prominent amber banner below
the counters: `⚑ Batch ready — review before publishing` with a link to `#review-queue` on the
page (this will be the anchor for the Outstanding tab upgrade in Task 3).

### Done condition for Task 1

The `AgentCommandCentre` component renders between the portfolio bar and the site card grid.
All fields show clean empty states when the underlying JSON files do not exist.
`npm run build` passes.

---

## Task 2 — Pipeline tab in SiteCard

**Files to change:** `app/components/SiteCard.tsx`

Add `'Pipeline'` as a sixth tab in the `TABS` array:

```typescript
const TABS = ['Revenue', 'Agents', 'Pipeline', 'Outstanding', 'Marketing', 'Posts'] as const;
```

Place it at index 2 (between Agents and Outstanding) — this reflects the logical flow.

### Pipeline tab content

The tab receives `status.subagentStatus` and `status.graderVerdict` from the `SiteDetail`.

Layout — three sections stacked:

**Section 1 — Subagent**
- Label: `SUBAGENT`
- Status pill (same colours as the command centre strip above)
- If `briefGenerated` is true and `briefSummary` is not null, show the brief summary in a
  zinc-50 rounded block (dark: zinc-800). Label: `BRIEF THIS WEEK`
- If `briefGenerated` is false, show: `No brief generated yet — lead coordinator has not run`

**Section 2 — Grader**
- Label: `OUTCOMES GRADER · {rubricName}`
- Verdict pill: `pass` → emerald, `fail` → red, `retry` → amber
- If `retryCount > 0`, show: `Retried {retryCount} time(s)` in zinc-500
- If `failedCriterion` is not null, show it in a red-50 (dark: red-900/20) rounded block with
  label `FAILED CRITERION`
- If verdict is `never_run`, show: `Grader has not run yet`

**Section 3 — Rubric criteria (collapsed by default)**
Hard-code the pass/fail criteria per site. Show a `RUBRIC ▼` toggle.

Criteria per site (from the architecture document):

```
didianolue:
  ✓ Communicates full-lifecycle procurement authority
  ✓ Speaks to senior commercial or public-sector audiences
  ✓ Contains a clear next step (contact, consult, connect)
  ✗ Fails if generic — no specific domain expertise visible

masteryourcareerpath:
  ✓ Reinforces or references PRIME or OPERATE frameworks
  ✓ Speaks to professionals seeking career transformation
  ✓ Includes a path to Skool community, course, or cohort
  ✗ Fails if frameworks are absent or unnamed

theconcurrentcontractor:
  ✓ Written through the lens of a practising UK IT contractor
  ✓ Addresses IR35, rate strategy, or market intel
  ✓ Practical and peer-to-peer in tone — not advisory
  ✗ Fails if it reads as generic career or recruitment content

oldoaktown:
  ✓ Every factual claim is verifiable — no invented businesses or events
  ✓ Rooted in Old Oak Common or Park Royal regeneration area
  ✓ Hyperlocal voice — community-first, not corporate
  ✗ Fails on any fabricated local detail — zero tolerance

aiviralvideoprompts:
  ✓ Contains a clear conversion action (link, CTA, offer)
  ✓ Hook lands in the first line — no warm-up sentences
  ✓ Addresses a specific creator pain point, not generic AI hype
  ✓ Platform-appropriate length and format
  ✗ Fails if no specific prompt example is included
```

Render pass criteria with a green `✓` and the fail criterion with a red `✗`.

### Done condition for Task 2

The Pipeline tab appears in every expanded SiteCard. All three sections render clean empty states.
`npm run build` passes.

---

## Task 3 — Review Queue (Outstanding tab upgrade)

**Files to change:** `app/components/SiteCard.tsx`

The Outstanding tab (tab index 3 after Task 2's insertion) currently shows two counters.
Keep those counters. Below them, add a new section:

**Label:** `REVIEW QUEUE`

**Source:** `reviewQueue` — this comes from `StatusResponse.reviewQueue`, filtered to
`item.siteId === site.id`. You will need to thread `reviewQueue: DraftItem[]` through as a prop
to `SiteCard`.

If `reviewQueue` (filtered) is empty:
- Show: `Nothing awaiting review` in zinc-400.

If items exist, render each as a card:

```
[ Platform pill ]  [ Verdict pill ]   Retry ×N (if retryCount > 0)
Failed criterion: "{failedCriterion}"   (if present, in red-50 block)
Content preview: "{contentSnippet}…"   (if present, in zinc-50 block, truncated to 80 chars)
```

Below the list, add an anchor target `id="review-queue"` on the Outstanding tab container so the
command centre's "Batch ready" link jumps to it correctly.

**Important:** Do not add approve/reject action buttons at this stage. The review queue is
read-only in this implementation. Didi publishes via Blotato manually after reviewing here.

### Done condition for Task 3

The Outstanding tab shows the review queue below the existing counters. Filtered correctly per
site. Empty state renders cleanly. `npm run build` passes.

---

## Task 4 — DailyBriefing logic update

**Files to change:** `app/components/DailyBriefing.tsx`

### Step 4a — Remove legacy agent references

Delete the `PRIORITY_AGENTS` constant entirely:

```typescript
// DELETE THIS:
const PRIORITY_AGENTS = ['curator', 'health', 'seo'];
```

Delete the loop that generates `agent-{name}-{siteId}` work items (the `for (const agentName of PRIORITY_AGENTS)` block).

### Step 4b — Remove stale static items

From `STATIC_ITEMS`, remove:
- `s4` ("Add CLAUDE.md to Didi, TCC, AIVVP repos") — outdated, no longer relevant
- `s5` ("Plan first curator + health agent run") — wrong agents, superseded by new architecture
- Keep `s6` ("Move TCC workshops to MYCP Skool") — still a live revenue action

### Step 4c — Update the prop to accept StatusResponse

Update `DailyBriefing` to receive the full `StatusResponse` rather than just `Record<string,
SiteDetail>`. Extract `sites`, `portfolioCoordinator`, and `reviewQueue` from it.

Update the call site in `page.tsx` accordingly.

### Step 4d — Add new dynamic items

In `buildItems`, after the existing per-site loops, add:

```typescript
// Batch ready for review
if (portfolioCoordinator?.batchStatus.readyForReview) {
  const n = portfolioCoordinator.batchStatus.approved;
  items.push({
    id: 'batch-ready',
    priority: 'high',
    category: 'Review',
    title: `${n} draft${n !== 1 ? 's' : ''} ready for review before publishing`,
    detail: 'Open the Review Queue in each site card',
  });
}

// Any failed grader verdicts
for (const [siteId, detail] of Object.entries(sites)) {
  const name = SITE_SHORT[siteId] ?? siteId;
  if (detail.graderVerdict?.verdict === 'fail') {
    items.push({
      id: `grader-fail-${siteId}`,
      priority: 'high',
      category: 'Grader',
      title: `Grader failed · ${name}`,
      detail: detail.graderVerdict.failedCriterion ?? 'Check the Pipeline tab',
    });
  }
}

// Lead coordinator hasn't run (Monday with no theme set)
if (!portfolioCoordinator?.weeklyTheme) {
  items.push({
    id: 'coordinator-no-theme',
    priority: 'med',
    category: 'Agents',
    title: 'No weekly theme set — lead coordinator has not run',
    detail: 'Set the theme in content-coordinator.json to trigger the pipeline',
  });
}
```

### Done condition for Task 4

DailyBriefing surfaces new multiagent work items and no longer references curator/health/seo
agents. Old static items removed. `npm run build` passes.

---

## Task 5 — Also update PortfolioBar

**Files to change:** `app/page.tsx`

The `PortfolioBar` currently counts active agents using `countActiveAgents(agentSummaries)` which
counts any agent with `status !== 'never_run'`. Now that the new architecture adds subagents and
graders, this count will include them automatically — no logic change needed.

However, update the PortfolioBar to show one additional metric:

Add a `| Batch: X/5 approved` indicator using `portfolioCoordinator.batchStatus`. Show it in
emerald if `approved === 5`, amber if `approved > 0`, zinc-400 if 0.

Thread `portfolioCoordinator` as a prop to `PortfolioBar`.

### Done condition for Task 5

PortfolioBar shows the batch status metric. `npm run build` passes.

---

## Task 6 — Legacy cleanup

**Files to change:** `app/page.tsx`, `app/components/SiteCard.tsx`

### Step 6a — Demote the Social Agent buttons

In `SiteCard.tsx`, the "Social Agent (Legacy)" button is at lines ~229–233. Change it so it:
- Is only rendered if `site.socialAgent` is defined (already the case)
- Uses `text-zinc-300` and `border-zinc-100` (lighter than current) to signal it is deprecated
- Has its label changed to `Legacy Social Agent`

Do not remove it entirely — it may still be useful for debugging. Just visually demote it.

### Step 6b — Clean up SITE_AGENT_NAMES

In `app/api/status/route.ts`, the `SITE_AGENT_NAMES` map and the `fetchAllAgentSummaries`
function fetch old agent JSON files (curator, health, seo, etc.). These agents still exist on the
sites, so do not remove their entries — the Agents tab still shows them. However, add a comment
above `SITE_AGENT_NAMES`:

```typescript
// Legacy per-site agents — still active, shown in the Agents tab.
// The new multiagent pipeline (subagent, grader) is handled separately
// via fetchSubagentStatus() and fetchGraderVerdict().
```

### Step 6c — Update the Agents tab label

In `SiteCard.tsx`, the Agents tab (tab index 1) currently renders a flat list of all agent
summaries. Add a section divider above the existing list:

```
LEGACY AGENTS
[ existing list of curator, health, seo, etc. ]
```

And if `subagentStatus` or `graderVerdict` are non-null, add a section above that:

```
PIPELINE AGENTS
Subagent — {status pill}
Grader — {verdict pill}
```

This gives a clean visual separation between the old and new agent generations.

### Done condition for Task 6

Legacy buttons demoted. Code comments added. Agents tab has clear section dividers.
`npm run build` passes. Deploy to Vercel and confirm the dashboard loads at
`dashboard-opal-kappa-70.vercel.app` with no console errors.

---

## Final verification checklist

After all tasks are complete:

- [ ] `npm run build` — zero errors, zero warnings
- [ ] `/api/status` returns the new `StatusResponse` shape with `sites`, `portfolioCoordinator`,
      `reviewQueue`
- [ ] Agent Command Centre renders between portfolio bar and site grid
- [ ] Pipeline tab appears in every SiteCard expanded panel with correct rubric criteria per site
- [ ] Review queue section appears in Outstanding tab (empty state renders cleanly)
- [ ] DailyBriefing no longer references curator/health/seo agents
- [ ] PortfolioBar shows batch status metric
- [ ] Legacy Social Agent buttons visually demoted
- [ ] Agents tab shows PIPELINE AGENTS section above LEGACY AGENTS
- [ ] All new empty states (null data) render cleanly — no undefined errors
- [ ] Deploy to Vercel and confirm live dashboard loads without errors
