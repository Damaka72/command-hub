import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  githubConfigured,
  listWorkflowRuns,
  getRunJobs,
  triggerWorkflow,
  isRunActive,
  type WorkflowRun,
  type WorkflowJob,
} from '../../lib/github';

export interface PipelineStatusResponse {
  configured: boolean;
  runs: WorkflowRun[];
  activeRun: WorkflowRun | null;
  activeJobs: WorkflowJob[];
}

// GET — recent pipeline runs plus live job/step detail for the newest run.
export async function GET() {
  if (!githubConfigured()) {
    return NextResponse.json(
      { configured: false, runs: [], activeRun: null, activeJobs: [] } satisfies PipelineStatusResponse,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const runs = await listWorkflowRuns(8);
  const latest = runs[0];
  // Fetch step detail for the newest run (whether active or just finished) so the
  // UI can show a live checklist while it runs and the final result afterwards.
  const activeJobs = latest ? await getRunJobs(latest.id) : [];

  const response: PipelineStatusResponse = {
    configured: true,
    runs,
    activeRun: isRunActive(latest) ? latest : null,
    activeJobs,
  };
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
}

// POST — trigger a new pipeline run (optionally for a single site).
export async function POST(request: NextRequest) {
  let site: string | undefined;
  try {
    const body = await request.json() as { site?: string };
    site = body.site?.trim() || undefined;
  } catch {
    // no body — run all sites
  }

  const result = await triggerWorkflow(site);
  if (!result.ok) {
    const status = result.reason === 'no_token' ? 200 : 502;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }
  return NextResponse.json({ ok: true });
}
