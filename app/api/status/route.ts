import { NextResponse } from 'next/server';

const VERCEL_TOKEN   = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = 'team_2fG7WKNEcvEFVhRPxREhEgs8';
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;

// Site-specific account IDs only (Instagram/TikTok/Pinterest/YouTube are 1:1 per site;
// Facebook/LinkedIn share a parent account ID across sites so are excluded here)
const BLOTATO_SITE_ACCOUNTS: Record<string, string[]> = {
  oldoaktown:              ['46484'],
  theconcurrentcontractor: ['46494', '36388'],
  masteryourcareerpath:    ['46492', '36387'],
  aiviralvideoprompts:     ['46493', '41948', '6423', '36389'],
  didianolue:              ['46490', '18212', '36391'],
};

// ─── Exported types ──────────────────────────────────────────────────────────

export interface RevenueMetrics {
  model: string;
  // consulting (didianolue)
  pipelineValue?: number;
  activeEnquiries?: number;
  highPriority?: number;
  overdueFollowUps?: number;
  meetingsBooked?: number;
  agentsActive?: number;
  agentsTotal?: number;
  // all sites
  contentActive?: boolean;
  monthlyRevenue?: number;
}

export interface AgentSummary {
  name: string;
  displayName: string;
  status: string;
  ago: string | null;
  lastAction: string | null;
}

export interface ReadinessItem {
  label: string;
  ok: boolean;
  reason: string;
}

export interface CoordinatorData {
  weekCommencing: string;
  weeklyTheme: string;
  campaignObjective: string;
  setAt: string;
}

export interface RevenueConfig {
  source: string;       // 'json_file' | 'gumroad_api' | 'booking_manual'
  label: string;
  currency: string;
  workshopPrice?: number;
  notes?: string;
}

export interface SiteDetail {
  up: boolean;
  deploy: { state: string; ago: string; commitMessage: string } | null;
  agent: { status: string; ago: string | null } | null;
  revenue: RevenueMetrics | null;
  agentSummaries: AgentSummary[];
  coordinator: CoordinatorData | null;
  readiness: ReadinessItem[];
  monthlyRevenue: number | null;
  lastActivity: string | null;
  scheduledCount: number;
  outstanding: { overdueFollowUps: number; awaitingApproval: number; };
  revenueConfig: RevenueConfig | null;
}

// ─── Static site configuration ───────────────────────────────────────────────

interface SiteConfig {
  id: string;
  url: string;
  vercelProjectId: string;
  revenueModel: string;
  revenueAgents?: string[];
  newsletterProvider: string | null;
  newsletterConnected: boolean;
  revenueProvider: string | null;
  revenueConnected: boolean;
  servesMostData: boolean; // false for Next.js sites that don't serve data/ publicly
}

const SITES: SiteConfig[] = [
  {
    id: 'oldoaktown',
    url: 'https://oldoaktown.co.uk',
    vercelProjectId: 'prj_IGyLo0ADMJlofgrPbyrWYwMYbgPo',
    revenueModel: 'media',
    newsletterProvider: 'Beehiiv',
    newsletterConnected: false,
    revenueProvider: 'Stripe',
    revenueConnected: true,
    servesMostData: true,
  },
  {
    id: 'theconcurrentcontractor',
    url: 'https://www.theconcurrentcontractor.com',
    vercelProjectId: 'prj_6a52DLbKMQSpKfcGFe0KpqfpNKie',
    revenueModel: 'leadgen',
    newsletterProvider: 'Constant Contact',
    newsletterConnected: false,
    revenueProvider: null,
    revenueConnected: false,
    servesMostData: false, // Next.js — data/ not in public/
  },
  {
    id: 'masteryourcareerpath',
    url: 'https://masteryourcareerpath.com',
    vercelProjectId: 'prj_5d1hVfhY4QBj1p0ntgDcueFo0zdd',
    revenueModel: 'skool',
    newsletterProvider: null,
    newsletterConnected: false,
    revenueProvider: 'Skool',
    revenueConnected: false,
    servesMostData: true,
  },
  {
    id: 'aiviralvideoprompts',
    url: 'https://aiviralvideoprompts.com',
    vercelProjectId: 'prj_Qf2os2TZQSoDpCTFOwUHGbjGNGeH',
    revenueModel: 'digital',
    newsletterProvider: null,
    newsletterConnected: false,
    revenueProvider: 'Gumroad',
    revenueConnected: false,
    servesMostData: true,
  },
  {
    id: 'didianolue',
    url: 'https://didianolue.co.uk',
    vercelProjectId: 'prj_MqTdvJPBlJRC0A6JIYBQLPEsnuQV',
    revenueModel: 'consulting',
    newsletterProvider: null,
    newsletterConnected: false,
    revenueProvider: null,
    revenueConnected: false,
    servesMostData: true,
    revenueAgents: [
      'https://didianolue.co.uk/data/agent-summaries/scout.json',
      'https://didianolue.co.uk/data/agent-summaries/outreach.json',
      'https://didianolue.co.uk/data/agent-summaries/enquiry.json',
      'https://didianolue.co.uk/data/agent-summaries/cv-tailor.json',
      'https://didianolue.co.uk/data/agent-summaries/packages.json',
      'https://didianolue.co.uk/data/agent-summaries/curator.json',
      'https://didianolue.co.uk/data/agent-summaries/repurpose.json',
      'https://didianolue.co.uk/data/agent-summaries/seo.json',
      'https://didianolue.co.uk/data/agent-summaries/health.json',
      'https://didianolue.co.uk/data/agent-summaries/social.json',
    ],
  },
];

const SITE_AGENT_NAMES: Record<string, string[]> = {
  oldoaktown:              ['curator', 'newsletter', 'health', 'seo', 'repurpose', 'marketing-assets'],
  theconcurrentcontractor: ['curator', 'newsletter', 'health', 'seo', 'repurpose', 'insight', 'marketing-assets'],
  masteryourcareerpath:    ['curator', 'newsletter', 'health', 'seo', 'repurpose', 'lead-nurture', 'product', 'marketing-assets'],
  aiviralvideoprompts:     ['curator', 'newsletter', 'health', 'seo', 'repurpose', 'prompt-pack', 'marketing-assets'],
  didianolue:              ['curator', 'newsletter', 'health', 'seo', 'repurpose', 'scout', 'outreach', 'cv-tailor', 'packages', 'social', 'enquiry', 'marketing-assets'],
};

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  curator:       'Content Curator',
  newsletter:    'Newsletter',
  health:        'Site Health',
  seo:           'SEO Gaps',
  repurpose:     'Repurpose',
  insight:       'Contract Insight',
  'lead-nurture':'Lead Nurture',
  product:       'Products',
  'prompt-pack': 'Prompt Pack',
  scout:         'Opportunity Scout',
  outreach:      'Outreach',
  'cv-tailor':        'CV Tailor',
  packages:           'Applications',
  social:             'Social',
  enquiry:            'Enquiries',
  'marketing-assets': 'Marketing Assets',
};

// Didianolue total (newsletter + 10 revenue agents)
const DIDIANOLUE_AGENT_TOTAL = 11;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

async function safeFetch(url: string, timeoutMs = 4000): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
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

async function fetchAllAgentSummaries(siteUrl: string, siteId: string): Promise<AgentSummary[]> {
  const agentNames = SITE_AGENT_NAMES[siteId] ?? [];
  return Promise.all(
    agentNames.map(async (name): Promise<AgentSummary> => {
      const data = await safeFetch(`${siteUrl}/data/agent-summaries/${name}.json`);
      const status = data === null ? 'never_run' : ((data.status as string) ?? 'unknown');
      const ago = data?.generatedAt ? timeAgo(data.generatedAt as string) : null;
      // Derive a brief last-action label from known fields
      let lastAction: string | null = null;
      if (data && status !== 'never_run') {
        if (name === 'scout'    && typeof data.count    === 'number') lastAction = `${data.count} opportunities`;
        if (name === 'outreach' && typeof data.total    === 'number') lastAction = `${data.total} contacts, ${data.overdue ?? 0} overdue`;
        if (name === 'enquiry'  && typeof data.total    === 'number') lastAction = `${data.total} enquiries, ${data.unread ?? 0} unread`;
        if (name === 'curator'  && typeof data.stats    === 'object') lastAction = `${(data.topPicks as unknown[])?.length ?? 0} picks`;
        if (name === 'newsletter' && data.latestDate)                 lastAction = `Latest ${data.latestDate}`;
        if (name === 'health'   && typeof data.pagesOk  === 'number') lastAction = `${data.pagesOk} pages OK`;
        if (name === 'seo'      && typeof data.totalPublished === 'number') lastAction = `${data.gaps ?? 0} gaps`;
        if (name === 'social'   && typeof data.scheduled === 'number') lastAction = `${data.scheduled} scheduled`;
      }
      return { name, displayName: AGENT_DISPLAY_NAMES[name] ?? name, status, ago, lastAction };
    })
  );
}

async function fetchCoordinator(siteUrl: string, site: SiteConfig): Promise<CoordinatorData | null> {
  if (!site.servesMostData) return null;
  const data = await safeFetch(`${siteUrl}/data/content-coordinator.json`);
  if (!data || !data.weeklyTheme) return null;
  return {
    weekCommencing:    (data.weekCommencing    as string) ?? '',
    weeklyTheme:       (data.weeklyTheme       as string) ?? '',
    campaignObjective: (data.campaignObjective as string) ?? '',
    setAt:             (data.setAt             as string) ?? '',
  };
}

async function fetchRevenueConfig(siteUrl: string): Promise<RevenueConfig | null> {
  const data = await safeFetch(`${siteUrl}/data/revenue-config.json`);
  if (!data || typeof data.source !== 'string') return null;
  return {
    source:        data.source                   as string,
    label:        (data.label        as string)  ?? 'Unknown',
    currency:     (data.currency     as string)  ?? 'GBP',
    workshopPrice: typeof data.workshopPrice === 'number' ? data.workshopPrice : undefined,
    notes:        (data.notes        as string)  ?? undefined,
  };
}

async function fetchGumroadMonthlyRevenue(apiKey: string): Promise<number | null> {
  const now   = new Date();
  const after = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  try {
    const res = await fetch(
      `https://api.gumroad.com/v2/sales?after=${encodeURIComponent(after)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; sales?: Array<{ price: number }> };
    if (!data.success || !Array.isArray(data.sales)) return null;
    const totalCents = data.sales.reduce((sum, s) => sum + (s.price ?? 0), 0);
    return Math.round(totalCents / 100);
  } catch { return null; }
}

async function resolveMonthlyRevenue(config: RevenueConfig | null): Promise<number | null> {
  if (!config) return null;
  if (config.source === 'gumroad_api') {
    const apiKey = process.env.GUMROAD_API_KEY;
    if (!apiKey) return null;
    return fetchGumroadMonthlyRevenue(apiKey);
  }
  return null;
}

async function fetchBlotatoScheduledCounts(): Promise<Record<string, number>> {
  if (!BLOTATO_API_KEY) return {};
  try {
    const res = await fetch('https://backend.blotato.com/schedules?limit=50', {
      headers: { Authorization: `Bearer ${BLOTATO_API_KEY}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return {};
    const data = await res.json() as { items?: Array<{ account?: { id?: string }; accountId?: string }> };
    const counts: Record<string, number> = {};
    for (const item of data.items ?? []) {
      const id = item.account?.id ?? item.accountId;
      if (!id) continue;
      for (const [siteId, ids] of Object.entries(BLOTATO_SITE_ACCOUNTS)) {
        if (ids.includes(id)) { counts[siteId] = (counts[siteId] ?? 0) + 1; break; }
      }
    }
    return counts;
  } catch { return {}; }
}

function computeReadiness(
  agentSummaries: AgentSummary[],
  coordinator: CoordinatorData | null,
  site: SiteConfig,
  contentActive: boolean,
): ReadinessItem[] {
  const anyActive   = agentSummaries.some(a => a.status !== 'never_run');
  const repurpose   = agentSummaries.find(a => a.name === 'repurpose');
  const themeSet    = !!(coordinator?.weeklyTheme);

  return [
    {
      label:  'Content scheduled in Blotato',
      ok:     contentActive,
      reason: contentActive ? 'Connected' : 'Run the Social Agent and schedule posts in Blotato',
    },
    {
      label:  `Newsletter → ${site.newsletterProvider ?? 'email provider'}`,
      ok:     site.newsletterConnected,
      reason: site.newsletterConnected
        ? 'Connected'
        : site.newsletterProvider
          ? `${site.newsletterProvider} not yet connected`
          : 'No email provider configured',
    },
    {
      label:  `Revenue source${site.revenueProvider ? ` (${site.revenueProvider})` : ''}`,
      ok:     site.revenueConnected,
      reason: site.revenueConnected
        ? 'Connected'
        : site.revenueProvider
          ? `${site.revenueProvider} not yet connected`
          : 'No revenue source configured',
    },
    {
      label:  'Weekly theme set',
      ok:     themeSet,
      reason: themeSet ? `"${coordinator!.weeklyTheme}"` : 'Run the Social Agent with a weekly theme',
    },
    {
      label:  'Marketing agent active',
      ok:     !!(repurpose && repurpose.status !== 'never_run'),
      reason: (repurpose && repurpose.status !== 'never_run') ? 'Running' : 'Repurpose agent not yet run',
    },
    {
      label:  'Agent data flowing',
      ok:     anyActive,
      reason: anyActive ? 'Agents active' : 'No agents have run yet',
    },
  ];
}

async function fetchRevenueMetrics(
  site: SiteConfig,
  newsletterData: Record<string, unknown> | null,
  agentSummaries: AgentSummary[],
): Promise<RevenueMetrics> {
  const base: RevenueMetrics = {
    model: site.revenueModel,
    contentActive: !!(newsletterData && newsletterData.status !== 'never_run'),
  };

  if (site.revenueModel !== 'consulting' || !site.revenueAgents) return base;

  const [scout, outreach, enquiry, ...rest] = await Promise.all(
    site.revenueAgents.map(url => safeFetch(url))
  );

  const opportunityCount = typeof scout?.count === 'number' ? scout.count : 0;
  const pipelineValue    = opportunityCount > 0 ? opportunityCount * 900 : undefined;
  const overdueFollowUps = typeof outreach?.overdue   === 'number' ? outreach.overdue   : undefined;
  const meetingsBooked   = typeof outreach?.meetings  === 'number' ? outreach.meetings  : undefined;
  const activeEnquiries  = typeof enquiry?.unread     === 'number' ? enquiry.unread     : undefined;
  const highPriority     = typeof enquiry?.highPriority === 'number' ? enquiry.highPriority : undefined;

  const allAgentData = [newsletterData, scout, outreach, enquiry, ...rest];
  const agentsActive = allAgentData.filter(d => d && d.status !== 'never_run').length;

  return {
    ...base,
    pipelineValue,
    activeEnquiries,
    highPriority,
    overdueFollowUps,
    meetingsBooked,
    agentsActive,
    agentsTotal: DIDIANOLUE_AGENT_TOTAL,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const blotatoCounts = await fetchBlotatoScheduledCounts();

  const results = await Promise.all(
    SITES.map(async (site): Promise<[string, SiteDetail]> => {
      // Parallel: uptime + Vercel deploy + newsletter agent + all agent summaries + coordinator
      const [up, deploy, newsletterData, agentSummaries, coordinator, revenueConfig] = await Promise.all([
        checkUptime(site.url),
        checkVercel(site.vercelProjectId),
        safeFetch(`${site.url}/data/agent-summaries/newsletter.json`),
        fetchAllAgentSummaries(site.url, site.id),
        fetchCoordinator(site.url, site),
        fetchRevenueConfig(site.url),
      ]);

      // Legacy agent field (backwards compat with existing page.tsx consumer)
      const agent = newsletterData
        ? newsletterData.status === 'never_run'
          ? { status: 'never_run', ago: null }
          : { status: (newsletterData.status as string) ?? 'ok', ago: newsletterData.generatedAt ? timeAgo(newsletterData.generatedAt as string) : null }
        : null;

      const [revenue, monthlyRevenue] = await Promise.all([
        fetchRevenueMetrics(site, newsletterData, agentSummaries),
        resolveMonthlyRevenue(revenueConfig),
      ]);
      const readiness = computeReadiness(agentSummaries, coordinator, site, !!(revenue.contentActive));

      // Last activity: most recent generatedAt across all agents
      const timestamps = agentSummaries
        .map(a => a.ago)
        .filter((a): a is string => a !== null);
      const lastActivity = timestamps.length > 0 ? timestamps[0] : null;

      const scheduledCount = blotatoCounts[site.id] ?? 0;

      // Outstanding
      const outreachSummary = agentSummaries.find(a => a.name === 'outreach');
      const curatorSummary  = agentSummaries.find(a => a.name === 'curator');
      const overdueFollowUps  = typeof revenue.overdueFollowUps === 'number' ? revenue.overdueFollowUps : 0;
      const awaitingApproval  = curatorSummary?.lastAction?.match(/(\d+) picks/)?.[1]
        ? parseInt(curatorSummary.lastAction) : 0;

      return [site.id, {
        up,
        deploy,
        agent,
        revenue,
        agentSummaries,
        coordinator,
        readiness,
        monthlyRevenue,
        lastActivity,
        scheduledCount,
        outstanding: { overdueFollowUps, awaitingApproval },
        revenueConfig,
      }];
    })
  );

  return NextResponse.json(Object.fromEntries(results), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
