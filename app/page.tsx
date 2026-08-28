"use client";

import { useCallback, useEffect, useState } from "react";
import DailyBriefing from "./components/DailyBriefing";
import AutomationStatus from "./components/AutomationStatus";
import TodayFocus from "./components/TodayFocus";
import SidebarTasks from "./components/SidebarTasks";
import CollapsibleSitePanel from "./components/CollapsibleSitePanel";
import { useWeek } from "./context/WeekContext";
import type { SiteDetail, StatusResponse, DraftItem, WeekReview } from "./api/status/route";
import type { HomeResponse } from "./api/home/route";
import { PIPELINE_SITE_COUNT } from "@/agents/site-configs";
import { SITES } from "./lib/sites";

const OPEN_PANELS_KEY = "hub:sitePanelsOpen";

// Header nav, in the order the weekly rhythm actually runs (Sat → Fri) —
// each chip carries a day hint so the nav itself says when it's used, not
// just what it's called. Library and Ops Guide aren't tied to a day, so
// they sit apart as reference/utility links rather than mixed into the flow.
// All four share one accent treatment (not a different hue per page) — the
// day hint is what tells them apart, not color.
const RHYTHM_NAV = [
  { href: "/plan",        label: "Weekly Plan",  hint: "Sat–Sun" },
  { href: "/review",      label: "Review",       hint: "Sun" },
  { href: "/newsletters", label: "Newsletters",  hint: "Sun" },
  { href: "/friday",      label: "Friday",       hint: "Fri" },
] as const;

const UTILITY_NAV = [
  { href: "/library", label: "Library" },
  { href: "/social",  label: "Social Accounts" },
  { href: "/guide",   label: "Ops Guide" },
] as const;

const sites = SITES;

type StatusMap = Record<string, SiteDetail>;

function updatedAgoLabel(d: Date | null): string {
  if (!d) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function PortfolioBar({ statusMap, reviewQueue, weekReview }: { statusMap: StatusMap; reviewQueue: DraftItem[]; weekReview: WeekReview | null }) {
  const statuses = Object.values(statusMap);

  const allRevenueNull = statuses.every(s => s.monthlyRevenue === null);
  const totalRevenue   = allRevenueNull
    ? null
    : statuses.reduce((sum, s) => sum + (s.monthlyRevenue ?? 0), 0);

  // Pipeline activity: how many of the pipeline sites have drafts in this week's review queue.
  const pipelineSites = new Set(reviewQueue.map(d => d.siteId)).size;

  const outstanding = statuses.reduce(
    (sum, s) => sum + s.outstanding.overdueFollowUps + s.outstanding.awaitingApproval, 0
  );

  const scheduled = statuses.reduce((sum, s) => sum + s.scheduledCount, 0);

  const Divider = () => <span style={{ color: 'var(--hub-border-hi)' }}>|</span>;

  return (
    <div style={{ borderBottom: '1px solid var(--hub-border)', background: 'var(--hub-surface-2)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <span className="shrink-0 text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.12em' }}>
          Portfolio
        </span>

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Revenue</span>
          <span className="font-semibold" style={{ color: totalRevenue !== null ? '#10b981' : 'var(--hub-text-3)' }}>
            {totalRevenue !== null ? `£${totalRevenue.toLocaleString()}/mo` : '—'}
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Pipeline</span>
          <span className="font-semibold" style={{
            color: pipelineSites === PIPELINE_SITE_COUNT
              ? '#10b981'
              : pipelineSites > 0
                ? '#f59e0b'
                : 'var(--hub-text-3)',
          }}>
            {pipelineSites}/{PIPELINE_SITE_COUNT} sites
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Outstanding</span>
          <span className="font-semibold" style={{ color: outstanding > 0 ? '#f87171' : 'var(--hub-text-3)' }}>
            {outstanding}{outstanding > 0 && ' ⚠'}
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Scheduled</span>
          <span className="font-semibold" style={{ color: scheduled > 0 ? '#10b981' : 'var(--hub-text-3)' }}>
            {scheduled} posts
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Batch</span>
          <span className="font-semibold" style={{
            color: (weekReview?.pushed ?? 0) > 0 && (weekReview?.approved ?? 0) === 0
              ? '#10b981'
              : (weekReview?.approved ?? 0) > 0
                ? '#f59e0b'
                : 'var(--hub-text-3)',
          }}>
            {weekReview?.approved ?? 0} approved · {weekReview?.pushed ?? 0} pushed
          </span>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const { week } = useWeek();
  const [statusMap,   setStatusMap]   = useState<StatusResponse | null>(null);
  const [homeData,    setHomeData]    = useState<HomeResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [, setTick]   = useState(0);
  const [openPanels,  setOpenPanels]  = useState<Set<string>>(new Set());

  // Panel open state persists across visits (UX spec §3.4). Reads
  // localStorage — an external, client-only source not available during the
  // initial render — so the sync happens post-mount.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_PANELS_KEY) ?? '[]') as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenPanels(new Set(saved));
    } catch { /* ignore malformed storage */ }
  }, []);

  const togglePanel = useCallback((siteId: string) => {
    setOpenPanels(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      localStorage.setItem(OPEN_PANELS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const loadStatus = useCallback(() => {
    setRefreshing(true);
    fetch('/api/status')
      .then(r => r.json())
      .then((d: StatusResponse) => { setStatusMap(d); setLastUpdated(new Date()); })
      .catch(() => setStatusMap(prev => prev ?? { sites: {}, portfolioCoordinator: null, reviewQueue: [], weekReview: null }))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetch(`/api/home?week=${week}`)
      .then(r => r.json())
      .then((d: HomeResponse) => setHomeData('error' in d ? null : d))
      .catch(() => setHomeData(null));
  }, [week]);

  // Poll for fresh status every 30s so the board stays live without a reload.
  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 30_000);
    return () => clearInterval(id);
  }, [loadStatus]);

  // Re-render every 5s so the "updated Ns ago" label keeps ticking between polls.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--hub-bg)' }}>

      {/* ── Header ── */}
      <header
        className="shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1c1712 0%, #14110d 60%, var(--hub-bg) 100%)',
          borderBottom: '1px solid var(--hub-border-hi)',
          boxShadow: '0 1px 20px rgba(217,119,87,0.08)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #e8e6dc 30%, #d97757 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Command Hub
              </h1>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--hub-text-3)' }}>
                Didi Anolue · {sites.length} sites active
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Weekly-rhythm pages, in the order the week runs — each chip says when it's used */}
              {RHYTHM_NAV.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-0 rounded-lg px-3 py-1 text-xs font-medium transition-all hover:brightness-125"
                  style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--hub-border-hi)' }}
                >
                  <span>{link.label}</span>
                  <span className="text-[10px] font-normal uppercase tracking-wide opacity-70">{link.hint}</span>
                </a>
              ))}

              <span className="mx-0.5 h-6 w-px" style={{ background: 'var(--hub-border)' }} aria-hidden="true" />

              {/* Reference / utility — not tied to a day */}
              {UTILITY_NAV.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                  style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-3)', border: '1px solid var(--hub-border)' }}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://drive.google.com/drive/folders/1VQFSQuwQyATw_voZanV0rQ_Z6TRvE7rk"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-3)', border: '1px solid var(--hub-border)' }}
              >
                Drive Folder ↗
              </a>
              <button
                onClick={loadStatus}
                title="Refresh now"
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${refreshing ? 'animate-hub-pulse' : ''}`}
                  style={{ background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }}
                />
                {refreshing ? 'Updating…' : `Live · ${updatedAgoLabel(lastUpdated)}`}
              </button>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}
              >
                {statusMap === null ? (
                  <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--hub-text-3)' }} />
                ) : (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: Object.values(statusMap.sites).every(s => s.up) ? '#10b981' : '#f59e0b',
                      boxShadow: Object.values(statusMap.sites).every(s => s.up)
                        ? '0 0 8px rgba(16,185,129,0.6)'
                        : '0 0 8px rgba(245,158,11,0.6)',
                    }}
                  />
                )}
                <span className="text-xs font-medium" style={{ color: 'var(--hub-text-2)' }}>
                  {statusMap === null ? 'Checking…' : `${Object.values(statusMap.sites).filter(s => s.up).length}/${sites.length} up`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <aside
          className="w-[300px] shrink-0 overflow-y-auto"
          style={{ background: 'var(--hub-surface)', borderRight: '1px solid var(--hub-border)' }}
        >
          {statusMap !== null && <DailyBriefing statusMap={statusMap} />}
          <SidebarTasks />
        </aside>

        {/* Right main area */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">

          {statusMap && Object.keys(statusMap.sites).length > 0 && (
            <PortfolioBar statusMap={statusMap.sites} reviewQueue={statusMap.reviewQueue} weekReview={statusMap.weekReview} />
          )}

          <main className="flex-1 px-6 py-8">
            {/* What today's job is, and where the whole week sits — first thing a newcomer sees */}
            <div className="mb-6">
              <TodayFocus />
            </div>

            {/* Is the automation working: coordinator, subagents, pipeline run, activity */}
            {statusMap && (
              <div className="mb-6">
                <AutomationStatus
                  portfolioCoordinator={statusMap.portfolioCoordinator}
                  sites={statusMap.sites}
                />
              </div>
            )}

            {/* ── Collapsible site panels (UX spec §3.4) ── */}
            <div className="flex flex-col gap-3">
              {sites.map((site) => (
                <CollapsibleSitePanel
                  key={site.id}
                  site={site}
                  status={statusMap?.sites[site.id]}
                  homeStat={homeData?.sites[site.id]}
                  reviewQueue={statusMap?.reviewQueue ?? []}
                  week={week}
                  open={openPanels.has(site.id)}
                  onToggle={() => togglePanel(site.id)}
                />
              ))}
            </div>
          </main>

          <footer
            className="shrink-0 py-5"
            style={{ borderTop: '1px solid var(--hub-border)', background: 'var(--hub-surface)' }}
          >
            <p className="text-center text-xs" style={{ color: 'var(--hub-text-3)' }}>
              Tasks saved in repo · Live · auto-refreshes every 30s
            </p>
          </footer>

        </div>
      </div>
    </div>
  );
}
