import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BLOTATO_SITE_ACCOUNTS } from '@/agents/accounts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  return (_supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ));
}

const VERCEL_TOKEN   = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "team_2fG7WKNEcvEFVhRPxREhEgs8";
const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;

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
  readiness: ReadinessItem[];
  monthlyRevenue: number | null;
  scheduledCount: number;
  outstanding: { overdueFollowUps: number; awaitingApproval: number; };
  revenueConfig: RevenueConfig | null;
}

export interface WeekReview {
  week: string | null;
  approved: number;
  pushed: number;
  needsMedia: number;
  draft: number;
  rejected: number;
  // Brand gate verdicts on this week's rows (draft or approved, not yet pushed).
  // All zero until Cowork starts writing gate_verdict.
  ready: number;
  flagged: number;
  blocked: number;
  unchecked: number;
}

export interface StatusResponse {
  sites: Record<string, SiteDetail>;
  weekReview: WeekReview | null;
}

// ─── Static site configuration ───────────────────────────────────────────────

interface SiteConfig {
  id: string;
  url: string;
  /** Null when the Vercel project isn't known; the deploy card is then left empty. */
  vercelProjectId: string | null;
  revenueModel: string;
  newsletterProvider: string | null;
  newsletterConnected: boolean;
  revenueProvider: string | null;
  revenueConnected: boolean;
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
  },
  {
    id: 'masteryourcareerpath',
    url: 'https://masteryourcareerpath.com',
    vercelProjectId: 'prj_5d1hVfhY4QBj1p0ntgDcueFo0zdd',
    revenueModel: 'own-platform',
    newsletterProvider: null,
    newsletterConnected: false,
    revenueProvider: 'MYCP platform',
    revenueConnected: false,
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
  },
  {
    id: 'world-of-contracts',
    url: 'https://www.worldofcontracts.co.uk',
    vercelProjectId: null, // not recorded here yet; only the up/down check runs
    revenueModel: 'jobs-board',
    newsletterProvider: null,
    newsletterConnected: false,
    revenueProvider: null,
    revenueConnected: false,
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

async function checkUptime(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}

async function checkVercel(projectId: string | null): Promise<{ state: string; ago: string; commitMessage: string } | null> {
  if (!VERCEL_TOKEN || !projectId) return null;
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
    const res = await fetch('https://backend.blotato.com/v2/schedules?limit=50', {
      headers: { 'blotato-api-key': BLOTATO_API_KEY },
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

// Review status for the most recent week in the content library. Counts by
// status, plus the Brand gate's verdicts on posts that are still in play.
async function fetchWeekReview(): Promise<WeekReview | null> {
  const empty: WeekReview = {
    week: null, approved: 0, pushed: 0, needsMedia: 0, draft: 0, rejected: 0,
    ready: 0, flagged: 0, blocked: 0, unchecked: 0,
  };
  try {
    const supabase = getSupabase();
    const { data: latest } = await supabase
      .from('content_library')
      .select('week_commencing')
      .order('week_commencing', { ascending: false })
      .limit(1)
      .maybeSingle();
    const week = (latest as { week_commencing?: string } | null)?.week_commencing ?? null;
    if (!week) return empty;

    // select('*'): gate_verdict may not exist until its migration is applied.
    const { data } = await supabase
      .from('content_library')
      .select('*')
      .eq('week_commencing', week);
    const rows = (data ?? []) as { status: string; site_id: string; gate_verdict?: string | null }[];
    // Only the three active brands count; rows for retired brands are ignored.
    const live = rows.filter(r => ['masteryourcareerpath', 'oldoaktown', 'aiviralvideoprompts'].includes(r.site_id));
    const c = (s: string) => live.filter(r => r.status === s).length;
    const inPlay = live.filter(r => r.status === 'draft' || r.status === 'approved_needs_media');
    const g = (v: string) => inPlay.filter(r => r.gate_verdict === v).length;
    return {
      week,
      approved:   c('approved'),
      pushed:     c('pushed'),
      needsMedia: c('approved_needs_media'),
      draft:      c('draft'),
      rejected:   c('rejected'),
      ready:      g('ready'),
      flagged:    g('flagged'),
      blocked:    g('blocked'),
      unchecked:  inPlay.filter(r => !r.gate_verdict).length,
    };
  } catch {
    return null;
  }
}

function computeReadiness(
  site: SiteConfig,
  contentActive: boolean,
): ReadinessItem[] {
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
  ];
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const [blotatoCounts, weekReview] = await Promise.all([
    fetchBlotatoScheduledCounts(),
    fetchWeekReview(),
  ]);

  const results = await Promise.all(
    SITES.map(async (site): Promise<[string, SiteDetail]> => {
      // Parallel: uptime + Vercel deploy + revenue config
      const [up, deploy, revenueConfig] = await Promise.all([
        checkUptime(site.url),
        checkVercel(site.vercelProjectId),
        fetchRevenueConfig(site.url),
      ]);

      const monthlyRevenue = await (
        site.id === 'aiviralvideoprompts' && process.env.GUMROAD_ACCESS
          ? fetchGumroadMonthlyRevenue(process.env.GUMROAD_ACCESS)
          : resolveMonthlyRevenue(revenueConfig)
      );

      const scheduledCount = blotatoCounts[site.id] ?? 0;
      const contentActive  = scheduledCount > 0;
      const revenue: RevenueMetrics = { model: site.revenueModel, contentActive };
      const readiness      = computeReadiness(site, contentActive);

      return [site.id, {
        up,
        deploy,
        revenue,
        readiness,
        monthlyRevenue,
        scheduledCount,
        outstanding: { overdueFollowUps: 0, awaitingApproval: 0 },
        revenueConfig,
      }];
    })
  );

  const response: StatusResponse = {
    sites: Object.fromEntries(results),
    weekReview,
  };
  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
