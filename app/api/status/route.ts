import { NextResponse } from 'next/server';

const VERCEL_TOKEN   = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = 'team_2fG7WKNEcvEFVhRPxREhEgs8';

interface SiteConfig {
  id: string;
  url: string;
  vercelProjectId: string;
  agentSummaryUrl?: string;
}

const SITES: SiteConfig[] = [
  { id: 'oldoaktown',             url: 'https://oldoaktown.co.uk',             vercelProjectId: 'prj_IGyLo0ADMJlofgrPbyrWYwMYbgPo',  agentSummaryUrl: 'https://oldoaktown.co.uk/data/agent-summaries/newsletter.json' },
  { id: 'theconcurrentcontractor',url: 'https://www.theconcurrentcontractor.com', vercelProjectId: 'prj_6a52DLbKMQSpKfcGFe0KpqfpNKie', agentSummaryUrl: 'https://www.theconcurrentcontractor.com/data/agent-summaries/newsletter.json' },
  { id: 'aiviralvideoprompts',    url: 'https://aiviralvideoprompts.com',      vercelProjectId: 'prj_Qf2os2TZQSoDpCTFOwUHGbjGNGeH',  agentSummaryUrl: 'https://aiviralvideoprompts.com/data/agent-summaries/newsletter.json' },
  { id: 'masteryourcareerpath',   url: 'https://masteryourcareerpath.com',     vercelProjectId: 'prj_5d1hVfhY4QBj1p0ntgDcueFo0zdd',  agentSummaryUrl: 'https://masteryourcareerpath.com/data/agent-summaries/newsletter.json' },
  { id: 'didianolue',             url: 'https://didianolue.co.uk',             vercelProjectId: 'prj_MqTdvJPBlJRC0A6JIYBQLPEsnuQV',  agentSummaryUrl: 'https://didianolue.co.uk/data/agent-summaries/newsletter.json' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

async function checkUptime(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}

async function checkVercel(projectId: string): Promise<{ state: string; ago: string; commitMessage: string } | null> {
  if (!VERCEL_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${VERCEL_TEAM_ID}&limit=1&target=production`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.deployments?.[0];
    if (!d) return null;
    return {
      state: d.state ?? 'UNKNOWN',
      ago: timeAgo(new Date(d.created).toISOString()),
      commitMessage: (d.meta?.githubCommitMessage ?? '').split('\n')[0].slice(0, 60),
    };
  } catch { return null; }
}

async function checkAgent(url: string): Promise<{ status: string; ago: string | null } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'never_run') return { status: 'never_run', ago: null };
    const ago = data.generatedAt ? timeAgo(data.generatedAt) : null;
    return { status: data.status ?? 'ok', ago };
  } catch { return null; }
}

export async function GET() {
  const results = await Promise.all(
    SITES.map(async (site) => {
      const [up, deploy, agent] = await Promise.all([
        checkUptime(site.url),
        checkVercel(site.vercelProjectId),
        site.agentSummaryUrl ? checkAgent(site.agentSummaryUrl) : Promise.resolve(null),
      ]);
      return [site.id, { up, deploy, agent }] as const;
    })
  );

  return NextResponse.json(Object.fromEntries(results), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
