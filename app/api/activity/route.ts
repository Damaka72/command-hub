import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { listWorkflowRuns } from '../../lib/github';

// ── "What has happened" feed ─────────────────────────────────────────────────
// Two sources, merged newest-first:
//   1. Local pipeline session files (data/sessions/*.json) — rich per-run detail
//      when running locally / on the pipeline machine.
//   2. GitHub Actions workflow runs — available in production (Vercel), where the
//      gitignored session files don't exist.

export type ActivityKind = 'pipeline_session' | 'workflow_run';
export type ActivityLevel = 'success' | 'warning' | 'error' | 'running' | 'info';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;            // ISO timestamp
  level: ActivityLevel;
  title: string;
  detail: string | null;
  meta: string[];        // small chips, e.g. ["12 approved", "3 failed"]
  url: string | null;
}

interface SessionFile {
  runAt: string;
  weekCommencing?: string;
  approved?: number;
  failed?: number;
  graderResults?: Array<{ siteId: string; verdict: string }>;
  drafts?: unknown[];
}

function readSessions(): ActivityEvent[] {
  try {
    const dir = path.join(process.cwd(), 'data', 'sessions');
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const events: ActivityEvent[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const s = JSON.parse(raw) as SessionFile;
        const approved = s.approved ?? 0;
        const failed = s.failed ?? 0;
        const sites = new Set((s.graderResults ?? []).map(r => r.siteId));
        const level: ActivityLevel = failed > 0 ? 'warning' : approved > 0 ? 'success' : 'info';

        const meta = [`${approved} approved`];
        if (failed > 0) meta.push(`${failed} failed`);
        if (sites.size > 0) meta.push(`${sites.size} site${sites.size === 1 ? '' : 's'}`);

        events.push({
          id: `session-${file.replace('.json', '')}`,
          kind: 'pipeline_session',
          at: s.runAt ?? new Date().toISOString(),
          level,
          title: 'Content pipeline run',
          detail: s.weekCommencing ? `Week commencing ${s.weekCommencing}` : null,
          meta,
          url: null,
        });
      } catch { /* skip malformed session file */ }
    }
    return events;
  } catch {
    return [];
  }
}

function runLevel(status: string, conclusion: string | null): ActivityLevel {
  if (status !== 'completed') return 'running';
  switch (conclusion) {
    case 'success':   return 'success';
    case 'failure':   return 'error';
    case 'timed_out': return 'error';
    case 'cancelled': return 'warning';
    default:          return 'info';
  }
}

async function readWorkflowRuns(): Promise<ActivityEvent[]> {
  const runs = await listWorkflowRuns(8);
  return runs.map(r => {
    const level = runLevel(r.status, r.conclusion);
    const meta: string[] = [r.event === 'workflow_dispatch' ? 'manual' : r.event];
    if (r.branch) meta.push(r.branch);
    return {
      id: `run-${r.id}`,
      kind: 'workflow_run',
      at: r.startedAt ?? r.createdAt,
      level,
      title:
        level === 'running' ? 'Pipeline running…' :
        level === 'success' ? 'Pipeline run succeeded' :
        level === 'error'   ? 'Pipeline run failed' :
        'Pipeline run finished',
      detail: r.commitMessage,
      meta,
      url: r.htmlUrl,
    } satisfies ActivityEvent;
  });
}

/**
 * Merge sessions and workflow runs. When both describe the same run (same day),
 * prefer the richer session record and drop the duplicate workflow run.
 */
function merge(sessions: ActivityEvent[], runs: ActivityEvent[]): ActivityEvent[] {
  const sessionDays = new Set(sessions.map(e => e.at.slice(0, 10)));
  const dedupedRuns = runs.filter(r => !sessionDays.has(r.at.slice(0, 10)));
  return [...sessions, ...dedupedRuns].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export interface ActivityResponse {
  events: ActivityEvent[];
}

export async function GET() {
  const [sessions, runs] = await Promise.all([
    Promise.resolve(readSessions()),
    readWorkflowRuns(),
  ]);

  const events = merge(sessions, runs).slice(0, 20);
  return NextResponse.json({ events } satisfies ActivityResponse, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
