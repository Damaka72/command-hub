"use client";

import { useCallback, useEffect, useState } from "react";
import DailyBriefing from "../components/DailyBriefing";
import TodayFocus from "../components/TodayFocus";
import SidebarTasks from "../components/SidebarTasks";
import CollapsibleSitePanel from "../components/CollapsibleSitePanel";
import HomeTrackers from "../components/HomeTrackers";
import { useWeek } from "../context/WeekContext";
import type { SiteDetail, StatusResponse, WeekReview } from "../api/status/route";
import type { HomeResponse } from "../api/home/route";
import { SITES } from "../lib/sites";

const OPEN_PANELS_KEY = "hub:sitePanelsOpen";

// Header nav, in the order the weekly rhythm actually runs (Sat → Fri) —
// each chip carries a day hint so the nav itself says when it's used, not
// just what it's called. Library and Ops Guide aren't tied to a day, so
// they sit apart as reference/utility links rather than mixed into the flow.
// All four share one accent treatment (not a different hue per page) — the
// day hint is what tells them apart, not color.
const RHYTHM_NAV = [
  { href: "/plan",        label: "Weekly focus",   hint: "Sat" },
  { href: "/review",      label: "Sunday review",  hint: "Sun" },
  { href: "/newsletters", label: "Newsletters",  hint: "Sun" },
  { href: "/friday",      label: "Friday",       hint: "Fri" },
] as const;

const UTILITY_NAV = [
  { href: "/library", label: "Library" },
  { href: "/social",  label: "Social Accounts" },
  { href: "/creative-studio", label: "Creative Studio" },
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

function Divider() {
  return <span style={{ color: 'var(--hub-border-hi)' }} aria-hidden="true">|</span>;
}

function PortfolioBar({ statusMap, weekReview }: { statusMap: StatusMap; weekReview: WeekReview | null }) {
  const statuses = Object.values(statusMap);

  const allRevenueNull = statuses.every(s => s.monthlyRevenue === null);
  const totalRevenue   = allRevenueNull
    ? null
    : statuses.reduce((sum, s) => sum + (s.monthlyRevenue ?? 0), 0);

  // Posts waiting on Didi this week: flagged or blocked by the Brand gate.
  const toDecide = (weekReview?.flagged ?? 0) + (weekReview?.blocked ?? 0);

  const outstanding = statuses.reduce(
    (sum, s) => sum + s.outstanding.overdueFollowUps + s.outstanding.awaitingApproval, 0
  );

  const scheduled = statuses.reduce((sum, s) => sum + s.scheduledCount, 0);

  return (
    <div style={{ borderBottom: '1px solid var(--hub-border)', background: 'var(--hub-surface-2)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <span className="shrink-0 text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.12em' }}>
          Portfolio
        </span>

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Revenue</span>
          <span className="font-semibold" style={{ color: totalRevenue !== null ? 'var(--ok)' : 'var(--hub-text-3)' }}>
            {totalRevenue !== null ? `£${totalRevenue.toLocaleString()}/mo` : '—'}
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>To decide</span>
          <span className="font-semibold" style={{ color: toDecide > 0 ? 'var(--bad)' : 'var(--hub-text-3)' }}>
            {toDecide} post{toDecide === 1 ? '' : 's'}
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Outstanding</span>
          <span className="font-semibold" style={{ color: outstanding > 0 ? 'var(--bad)' : 'var(--hub-text-3)' }}>
            {outstanding}{outstanding > 0 && ' ⚠'}
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Scheduled</span>
          <span className="font-semibold" style={{ color: scheduled > 0 ? 'var(--ok)' : 'var(--hub-text-3)' }}>
            {scheduled} posts
          </span>
        </span>

        <Divider />

        <span className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--hub-text-3)' }}>Batch</span>
          <span className="font-semibold" style={{
            color: (weekReview?.pushed ?? 0) > 0 && (weekReview?.approved ?? 0) === 0
              ? 'var(--ok)'
              : (weekReview?.approved ?? 0) > 0
                ? 'var(--warn)'
                : 'var(--hub-text-3)',
          }}>
            {weekReview?.approved ?? 0} approved · {weekReview?.pushed ?? 0} scheduled
          </span>
        </span>
      </div>
    </div>
  );
}

export default function OpsPage() {
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
      .catch(() => setStatusMap(prev => prev ?? { sites: {}, weekReview: null }))
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
    <div className="flex h-dvh flex-col" style={{ background: 'var(--hub-bg)' }}>

      {/* ── Header ── */}
      <header
        className="shrink-0"
        style={{
          background: 'linear-gradient(135deg, var(--panel-2) 0%, var(--panel) 60%, var(--bg) 100%)',
          borderBottom: '1px solid var(--line-2)',
          boxShadow: 'var(--shadow-glow)',
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, var(--fg) 30%, var(--accent) 100%)',
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
            <div className="flex flex-wrap items-center gap-2.5">
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

              <span className="mx-0.5 hidden h-6 w-px sm:inline-block" style={{ background: 'var(--hub-border)' }} aria-hidden="true" />

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
                  style={{ background: 'var(--ok)', boxShadow: '0 0 8px color-mix(in srgb, var(--ok) 60%, transparent)' }}
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
                      background: Object.values(statusMap.sites).every(s => s.up) ? 'var(--ok)' : 'var(--warn)',
                      boxShadow: `0 0 8px color-mix(in srgb, ${Object.values(statusMap.sites).every(s => s.up) ? 'var(--ok)' : 'var(--warn)'} 60%, transparent)`,
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

        {/* Left sidebar — hidden on small screens so the main column gets the whole width */}
        <aside
          className="hidden w-[300px] shrink-0 overflow-y-auto lg:block"
          style={{ background: 'var(--hub-surface)', borderRight: '1px solid var(--hub-border)' }}
        >
          {statusMap !== null && <DailyBriefing statusMap={statusMap} />}
          <SidebarTasks />
        </aside>

        {/* Right main area */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto">

          {statusMap && Object.keys(statusMap.sites).length > 0 && (
            <PortfolioBar statusMap={statusMap.sites} weekReview={statusMap.weekReview} />
          )}

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {/* Work overview: summary band, your next steps, one card per site */}
            <div className="mb-8">
              <HomeTrackers />
            </div>

            {/* What today's job is, and where the whole week sits */}
            <div className="mb-6">
              <TodayFocus />
            </div>

            {/* ── Collapsible site panels (UX spec §3.4) ── */}
            <h2 className="mb-3 text-lg font-bold" style={{ color: 'var(--fg)' }}>Sites and operations</h2>
            <div className="flex flex-col gap-3">
              {sites.map((site) => (
                <CollapsibleSitePanel
                  key={site.id}
                  site={site}
                  status={statusMap?.sites[site.id]}
                  homeStat={homeData?.sites[site.id]}
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
