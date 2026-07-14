import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  return (_supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ));
}

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
  contentActive?: boolean;
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

export interface SubagentStatus {
  lastRun: string | null;
  status: 'idle' | 'running' | 'complete' | 'error' | 'never_run';
  briefGenerated: boolean;
  briefSummary: string | null;
}

export interface GraderVerdict {
  rubricName: string;
  verdict: 'pass' | 'fail' | 'retry' | 'never_run';
  retryCount: number;
  failedCriterion: string | null;
  lastRun: string | null;
}

export interface PortfolioCoordinator {
  lastRun: string | null;
  sourceFile: string;
  weeklyTheme: string | null;
  weekCommencing: string | null;
  campaignObjective: string | null;
  batchStatus: {
    approved: number;
    pending: number;
    failed: number;
    readyForReview: boolean;
  };
}

export interface DraftItem {
  siteId: string;
  platform: string;
  graderVerdict: 'pass' | 'fail' | 'retry';
  retryCount: number;
  failedCriterion: string | null;
  contentSnippet: string | null;
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
  revenue: RevenueMetrics | null;
  coordinator: CoordinatorData | null;
  readiness: ReadinessItem[];
  monthlyRevenue: number | null;
  scheduledCount: number;
  outstanding: { overdueFollowUps: number; awaitingApproval: number; };
  revenueConfig: RevenueConfig | null;
  subagentStatus: SubagentStatus | null;
  graderVerdict: GraderVerdict | null;
}

export interface StatusResponse {
  sites: Record<string, SiteDetail>;
  portfolioCoordinator: PortfolioCoordinator | null;
  reviewQueue: DraftItem[];
}

// ─── Static site configuration ───────────────────────────────────────────────

interface SiteConfig {
  id: string;
  url: string;
  vercelProjectId: string;
  revenueModel: string;
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
  },
];

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

function readLocalJson<T>(filePath: string): T | null {
  try {
    const full = path.join(process.cwd(), filePath);
    if (!fs.existsSync(full)) return null;
    return JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
  } catch {
    return null;
  }
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

async function fetchSubagentStatus(siteId: string): Promise<SubagentStatus | null> {
  // 1. Local file (written by npm run pipeline on this machine)
  const local = readLocalJson<SubagentStatus>(`data/sites/${siteId}/subagent-status.json`);
  if (local) return local;
  // 2. Supabase (written by pipeline, readable on Vercel)
  const { data: rawRow0 } = await getSupabase()
    .from('pipeline_site_data')
    .select('subagent_status')
    .eq('site_id', siteId)
    .single();
  const row0 = rawRow0 as unknown as { subagent_status: unknown } | null;
  if (row0?.subagent_status) return row0.subagent_status as SubagentStatus;
  return null;
}

async function fetchGraderVerdict(siteId: string): Promise<GraderVerdict | null> {
  // 1. Local file
  const local = readLocalJson<GraderVerdict>(`data/sites/${siteId}/grader-verdict.json`);
  if (local) return local;
  // 2. Supabase
  const { data: rawRow1 } = await getSupabase()
    .from('pipeline_site_data')
    .select('grader_verdict')
    .eq('site_id', siteId)
    .single();
  const row1 = rawRow1 as unknown as { grader_verdict: unknown } | null;
  if (row1?.grader_verdict) return row1.grader_verdict as GraderVerdict;
  return null;
}

async function fetchPortfolioCoordinator(): Promise<PortfolioCoordinator | null> {
  // Read from local file first, then fall back to the live site
  const local = readLocalJson<{ weeklyTheme?: string; weekCommencing?: string; campaignObjective?: string; setAt?: string }>('data/content-coordinator.json');
  const src = local ?? await safeFetch('https://didianolue.co.uk/data/content-coordinator.json');
  if (!src) return null;
  const approved = typeof (src as Record<string, unknown>).approved === 'number' ? (src as Record<string, unknown>).approved as number : 0;
  const pending  = typeof (src as Record<string, unknown>).pending  === 'number' ? (src as Record<string, unknown>).pending  as number : 0;
  const failed   = typeof (src as Record<string, unknown>).failed   === 'number' ? (src as Record<string, unknown>).failed   as number : 0;
  return {
    lastRun:           ((src as Record<string, unknown>).setAt          as string) ?? null,
    sourceFile:        'content-coordinator.json',
    weeklyTheme:       ((src as Record<string, unknown>).weeklyTheme    as string) ?? null,
    weekCommencing:    ((src as Record<string, unknown>).weekCommencing as string) ?? null,
    campaignObjective: ((src as Record<string, unknown>).campaignObjective as string) ?? null,
    batchStatus: { approved, pending, failed, readyForReview: pending === 0 && approved > 0 },
  };
}

async function fetchReviewQueue(): Promise<DraftItem[]> {
  const siteIds = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];
  const allItems: DraftItem[] = [];

  for (const siteId of siteIds) {
    // 1. Local file
    const local = readLocalJson<{ drafts: DraftItem[] }>(`data/sites/${siteId}/review-queue.json`);
    if (local?.drafts) { allItems.push(...local.drafts); continue; }
    // 2. Supabase
    const { data: rawRow2 } = await getSupabase()
      .from('pipeline_site_data')
      .select('review_queue')
      .eq('site_id', siteId)
      .single();
    const row2 = rawRow2 as unknown as { review_queue: unknown } | null;
    if (row2?.review_queue) {
      const q = row2.review_queue as { drafts?: DraftItem[] };
      if (q.drafts?.length) { allItems.push(...q.drafts); continue; }
    }
  }

  return allItems;
}

function computeReadiness(
  coordinator: CoordinatorData | null,
  site: SiteConfig,
  contentActive: boolean,
): ReadinessItem[] {
  const themeSet = !!(coordinator?.weeklyTheme);

  return [
    {
      label:  'Content scheduled in Blotato',
      ok:     contentActive,
      reason: contentActive ? 'Connected' : 'Schedule posts in Blotato',
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
      reason: themeSet ? `"${coordinator!.weeklyTheme}"` : 'Set this week\'s theme in the weekly plan',
    },
  ];
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const [blotatoCounts, portfolioCoordinator, reviewQueue] = await Promise.all([
    fetchBlotatoScheduledCounts(),
    fetchPortfolioCoordinator(),
    fetchReviewQueue(),
  ]);

  const results = await Promise.all(
    SITES.map(async (site): Promise<[string, SiteDetail]> => {
      // Parallel: uptime + Vercel deploy + coordinator + revenue config + pipeline status
      const [up, deploy, coordinator, revenueConfig, subagentStatus, graderVerdict] = await Promise.all([
        checkUptime(site.url),
        checkVercel(site.vercelProjectId),
        fetchCoordinator(site.url, site),
        fetchRevenueConfig(site.url),
        fetchSubagentStatus(site.id),
        fetchGraderVerdict(site.id),
      ]);

      const monthlyRevenue = await (
        site.id === 'aiviralvideoprompts' && process.env.GUMROAD_ACCESS
          ? fetchGumroadMonthlyRevenue(process.env.GUMROAD_ACCESS)
          : resolveMonthlyRevenue(revenueConfig)
      );

      const scheduledCount = blotatoCounts[site.id] ?? 0;
      const contentActive  = scheduledCount > 0;
      const revenue: RevenueMetrics = { model: site.revenueModel, contentActive };
      const readiness      = computeReadiness(coordinator, site, contentActive);

      return [site.id, {
        up,
        deploy,
        revenue,
        coordinator,
        readiness,
        monthlyRevenue,
        scheduledCount,
        outstanding: { overdueFollowUps: 0, awaitingApproval: 0 },
        revenueConfig,
        subagentStatus,
        graderVerdict,
      }];
    })
  );

  const response: StatusResponse = {
    sites: Object.fromEntries(results),
    portfolioCoordinator,
    reviewQueue,
  };
  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
