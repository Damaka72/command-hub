// ── GitHub Actions helper (server-only) ──────────────────────────────────────
// Reads and triggers the Weekly Content Pipeline workflow so the dashboard can
// show a live run in progress and let you kick one off on demand.
//
// Uses the same GITHUB_TOKEN / REPO already relied on by app/api/tasks/route.ts.
// Everything degrades gracefully when the token is missing.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO ?? 'Damaka72/command-hub';
const WORKFLOW_FILE = 'weekly-pipeline.yml';
const DEFAULT_REF = process.env.GITHUB_REF_BRANCH ?? 'main';

const API = 'https://api.github.com';

export function githubConfigured(): boolean {
  return !!GITHUB_TOKEN;
}

function ghHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'command-hub-dashboard',
  };
}

export type RunStatus = 'queued' | 'in_progress' | 'completed' | string;
export type RunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;

export interface WorkflowStep {
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  number: number;
}

export interface WorkflowJob {
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  startedAt: string | null;
  completedAt: string | null;
  steps: WorkflowStep[];
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: RunStatus;
  conclusion: RunConclusion;
  event: string;
  branch: string | null;
  commitMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  htmlUrl: string;
}

interface RawRun {
  id: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  event?: string;
  head_branch?: string | null;
  head_commit?: { message?: string } | null;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
  html_url: string;
}

function normaliseRun(r: RawRun): WorkflowRun {
  return {
    id: r.id,
    name: r.name ?? 'Weekly Content Pipeline',
    status: (r.status as RunStatus) ?? 'completed',
    conclusion: (r.conclusion as RunConclusion) ?? null,
    event: r.event ?? 'schedule',
    branch: r.head_branch ?? null,
    commitMessage: (r.head_commit?.message ?? '').split('\n')[0] || null,
    createdAt: r.created_at,
    startedAt: r.run_started_at ?? null,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
  };
}

/** Most recent workflow runs for the pipeline (newest first). */
export async function listWorkflowRuns(limit = 8): Promise<WorkflowRun[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(
      `${API}/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=${limit}`,
      { headers: ghHeaders(), signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as { workflow_runs?: RawRun[] };
    return (data.workflow_runs ?? []).map(normaliseRun);
  } catch {
    return [];
  }
}

/** Per-job step detail for one run — used to show live progress. */
export async function getRunJobs(runId: number): Promise<WorkflowJob[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(
      `${API}/repos/${REPO}/actions/runs/${runId}/jobs`,
      { headers: ghHeaders(), signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      jobs?: Array<{
        name: string;
        status?: string;
        conclusion?: string | null;
        started_at?: string | null;
        completed_at?: string | null;
        steps?: Array<{ name: string; status?: string; conclusion?: string | null; number: number }>;
      }>;
    };
    return (data.jobs ?? []).map(j => ({
      name: j.name,
      status: (j.status as RunStatus) ?? 'completed',
      conclusion: (j.conclusion as RunConclusion) ?? null,
      startedAt: j.started_at ?? null,
      completedAt: j.completed_at ?? null,
      steps: (j.steps ?? []).map(s => ({
        name: s.name,
        status: (s.status as RunStatus) ?? 'completed',
        conclusion: (s.conclusion as RunConclusion) ?? null,
        number: s.number,
      })),
    }));
  } catch {
    return [];
  }
}

export interface TriggerResult {
  ok: boolean;
  reason?: string;
}

/** Kick off a new pipeline run via workflow_dispatch. */
export async function triggerWorkflow(site?: string): Promise<TriggerResult> {
  if (!GITHUB_TOKEN) return { ok: false, reason: 'no_token' };
  try {
    const res = await fetch(
      `${API}/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: DEFAULT_REF, inputs: site ? { site } : {} }),
        signal: AbortSignal.timeout(10000),
      },
    );
    // 204 No Content on success
    if (res.status === 204) return { ok: true };
    const text = await res.text().catch(() => '');
    return { ok: false, reason: `github_${res.status}${text ? `: ${text.slice(0, 120)}` : ''}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'request_failed' };
  }
}

export function isRunActive(run: WorkflowRun | undefined): boolean {
  return !!run && run.status !== 'completed';
}
