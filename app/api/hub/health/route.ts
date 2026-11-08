// ── Site health check ────────────────────────────────────────────────────────
//   GET /api/hub/health → one entry per site in data/hub/sites.json:
//     live / attention / down, response time, and the last production deploy
//     from Vercel (needs VERCEL_TOKEN, the same one /api/status uses; without
//     it deploys are null and the card says so).
// Auth is enforced app-wide by the root proxy.ts — no per-route check here.

import { NextResponse } from 'next/server';
import { HUB_SITES, VERCEL_TEAM_ID, type HubSite } from '@/app/lib/hub/data';

export const dynamic = 'force-dynamic';

export type SiteHealthState = 'live' | 'attention' | 'down' | 'unknown';

export interface SiteDeploy {
  /** Vercel state: READY, ERROR, BUILDING, QUEUED, CANCELED… */
  state: string;
  createdAt: string;
  commitMessage: string;
}

export interface SiteHealth {
  id: string;
  state: SiteHealthState;
  /** Plain-language reason when not simply live, e.g. "Last deploy failed". */
  reason: string | null;
  httpStatus: number | null;
  responseMs: number | null;
  deploy: SiteDeploy | null;
}

export interface HealthResponse {
  checkedAt: string;
  /** False when VERCEL_TOKEN is not set, so "no deploy info" can be explained. */
  deploysConfigured: boolean;
  sites: SiteHealth[];
}

async function checkLive(url: string): Promise<{ ok: boolean; status: number | null; ms: number | null }> {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(7000), cache: 'no-store' });
    // Only the status line matters; don't hold the body open.
    void res.body?.cancel();
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch {
    return { ok: false, status: null, ms: null };
  }
}

async function lastDeploy(site: HubSite, token: string): Promise<SiteDeploy | null> {
  try {
    const id = site.vercelProjectId ?? site.vercelProject;
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(id)}&teamId=${VERCEL_TEAM_ID}&limit=1&target=production`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' },
    );
    if (!res.ok) return null;
    const d = (await res.json()).deployments?.[0];
    if (!d) return null;
    return {
      state: d.state ?? d.readyState ?? 'UNKNOWN',
      createdAt: new Date(d.created ?? d.createdAt).toISOString(),
      commitMessage: String(d.meta?.githubCommitMessage ?? '').split('\n')[0].slice(0, 80),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  const sites = await Promise.all(
    HUB_SITES.map(async (site): Promise<SiteHealth> => {
      const [live, deploy] = await Promise.all([checkLive(site.url), token ? lastDeploy(site, token) : Promise.resolve(null)]);
      let state: SiteHealthState = 'live';
      let reason: string | null = null;
      if (!live.ok) {
        state = 'down';
        reason = live.status ? `Site returned HTTP ${live.status}` : 'Site did not respond';
      } else if (deploy && (deploy.state === 'ERROR' || deploy.state === 'CANCELED')) {
        state = 'attention';
        reason = deploy.state === 'ERROR' ? 'Last deploy failed' : 'Last deploy was cancelled';
      }
      return { id: site.id, state, reason, httpStatus: live.status, responseMs: live.ms, deploy };
    }),
  );
  // If every single check failed without any HTTP answer, the problem is far
  // more likely the checker's own connection than five sites down at once, so
  // say "couldn't check" rather than raising five false alarms.
  if (sites.length > 1 && sites.every(s => s.httpStatus === null)) {
    for (const s of sites) { s.state = 'unknown'; s.reason = "Couldn't check from here. Try again shortly."; }
  }
  return NextResponse.json(
    { checkedAt: new Date().toISOString(), deploysConfigured: !!token, sites } satisfies HealthResponse,
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
