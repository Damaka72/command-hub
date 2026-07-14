"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteCard from "./components/SiteCard";
import DailyBriefing from "./components/DailyBriefing";
import AgentCommandCentre from "./components/AgentCommandCentre";
import SidebarTasks from "./components/SidebarTasks";
import DiPipeline from "./components/DiPipeline";
import SundayView from "./components/SundayView";
import PipelineRunner from "./components/PipelineRunner";
import ActivityFeed from "./components/ActivityFeed";
import type { SiteDetail, AgentSummary, StatusResponse, PortfolioCoordinator } from "./api/status/route";

const sites = [
  {
    id: "oldoaktown",
    name: "Old Oak Town",
    url: "oldoaktown.co.uk",
    description: "Hyperlocal news & community for Old Oak Common regeneration",
    github: "https://github.com/Damaka72/oldoaktown",
    admin: "https://oldoaktown.co.uk/admin",
    socialAgent: "https://oldoaktown.co.uk/social-agent",
    brandColor: "#4C8A35",
    initials: "OO",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram',
        schedule: '1 post/day',
        contentPillars: ['Local news', 'Business spotlights', 'Regeneration updates', 'Community events', 'Planning & development'],
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'Weekly newsletter (TBC)',
        nextAction: 'Set Beehiiv newsletter template and cadence',
      },
    },
  },
  {
    id: "theconcurrentcontractor",
    name: "The Concurrent Contractor",
    url: "theconcurrentcontractor.com",
    description: "IR35, contracting resources and community",
    github: "https://github.com/Damaka72/Theconcurrentcontractor",
    admin: "https://www.theconcurrentcontractor.com/admin",
    socialAgent: "https://www.theconcurrentcontractor.com/social-agent",
    brandColor: "#FFD700",
    initials: "TC",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + YouTube',
        schedule: '1 post/day',
        contentPillars: ['IR35 guidance', 'Contracting tips', 'Community wins', 'TCC Command Centre', 'Career transitions'],
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'not_started' as const,
        statusLabel: 'Not set up',
        cadence: 'Weekly (Constant Contact)',
        nextAction: 'Complete Constant Contact OAuth setup — flip DEMO_MODE=false',
      },
    },
  },
  {
    id: "masteryourcareerpath",
    name: "Master Your Career Path",
    url: "masteryourcareerpath.com",
    description: "Career development, coaching and PRIME/OPERATE frameworks",
    github: "https://github.com/Damaka72/Masteryourcareerpath",
    admin: "https://masteryourcareerpath.com/admin",
    socialAgent: "https://masteryourcareerpath.com/social-agent",
    brandColor: "#F5A623",
    initials: "MY",
    driveFolders: [
      { label: "Drive: MYCP Root", url: "https://drive.google.com/drive/folders/1-MQvh4R896EVtO5NucFDvtctppSOaiqd" },
      { label: "Drive: PRIME", url: "https://drive.google.com/drive/folders/1D-LF8VMQIBO5Ri53aks5_C8lpyOCYoUH" },
      { label: "Drive: OPERATE", url: "https://drive.google.com/drive/folders/1VWuK0HAlpg4YvaUugjNPTux6BkhQeP0s" },
    ],
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram',
        schedule: '1 post/day',
        contentPillars: ['Career strategy', 'IR35 & contracting', 'PRIME framework', 'Community wins', 'LinkedIn growth'],
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'Weekly newsletter (TBC)',
        nextAction: 'Draft welcome email sequence in Beehiiv',
      },
    },
  },
  {
    id: "aiviralvideoprompts",
    name: "AI Viral Video Prompts",
    url: "aiviralvideoprompts.com",
    description: "AI-powered prompts for creating viral video content",
    github: "https://github.com/Damaka72/ai-viral-video-prompts",
    admin: "https://aiviralvideoprompts.com/admin",
    socialAgent: "https://aiviralvideoprompts.com/social-agent",
    brandColor: "#4ECDC4",
    initials: "AI",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + TikTok + Pinterest + YouTube',
        schedule: '1 post/day',
        contentPillars: ['Prompt demos', 'Before/after results', 'Quick tutorials', 'Gumroad product spotlights', 'Creator tips'],
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'Weekly newsletter (TBC)',
        nextAction: 'Set up Beehiiv promotional email for 50% off campaign',
      },
    },
  },
  {
    id: "didianolue",
    name: "Didi Anolue",
    url: "didianolue.co.uk",
    description: "Personal consultancy site — procurement & commercial leadership",
    github: "https://github.com/Damaka72/didi-anolue-landing-page",
    admin: "https://didianolue.co.uk/admin",
    socialAgent: "https://didianolue.co.uk/social-agent",
    brandColor: "#4A7FC1",
    initials: "DA",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + Twitter/X + YouTube',
        schedule: '3x/week',
        contentPillars: ['Procurement insights', 'Contract wins', 'Commercial leadership', 'IR35 & consulting', 'Behind the brand'],
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'not_started' as const,
        statusLabel: 'Not set up',
        cadence: 'Monthly newsletter (TBC)',
        nextAction: 'Choose email provider and set up newsletter',
      },
    },
  },
];

type StatusMap = Record<string, SiteDetail>;

function updatedAgoLabel(d: Date | null): string {
  if (!d) return '—';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function countActiveAgents(summaries: AgentSummary[]): number {
  return summaries.filter(a => a.status !== 'never_run').length;
}

function PortfolioBar({ statusMap, portfolioCoordinator }: { statusMap: StatusMap; portfolioCoordinator: PortfolioCoordinator | null }) {
  const statuses = Object.values(statusMap);

  const allRevenueNull = statuses.every(s => s.monthlyRevenue === null);
  const totalRevenue   = allRevenueNull
    ? null
    : statuses.reduce((sum, s) => sum + (s.monthlyRevenue ?? 0), 0);

  const activeAgents = statuses.reduce(
    (sum, s) => sum + countActiveAgents(s.agentSummaries), 0
  );

  const outstanding = statuses.reduce(
    (sum, s) => sum + s.outstanding.overdueFollowUps + s.outstanding.awaitingApproval, 0
  );

  const scheduled = statuses.reduce((sum, s) => sum + s.scheduledCount, 0);

  const Divider = () => <span style={{ color: 'var(--hub-border-hi)' }}>|</span>;

  return (
    <div style={{ borderBottom: '1px solid var(--hub-border)', background: 'var(--hub-surface-2)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.12em' }}>
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
          <span style={{ color: 'var(--hub-text-3)' }}>Agents</span>
          <span className="font-semibold" style={{ color: activeAgents > 0 ? '#10b981' : 'var(--hub-text-3)' }}>
            {activeAgents} active
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
            color: (portfolioCoordinator?.batchStatus.approved ?? 0) === 5
              ? '#10b981'
              : (portfolioCoordinator?.batchStatus.approved ?? 0) > 0
                ? '#f59e0b'
                : 'var(--hub-text-3)',
          }}>
            {portfolioCoordinator?.batchStatus.approved ?? 0}/5 approved
          </span>
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [statusMap,   setStatusMap]   = useState<StatusResponse | null>(null);
  const [showSunday,  setShowSunday]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [, setTick]   = useState(0);

  const loadStatus = useCallback(() => {
    setRefreshing(true);
    fetch('/api/status')
      .then(r => r.json())
      .then((d: StatusResponse) => { setStatusMap(d); setLastUpdated(new Date()); })
      .catch(() => setStatusMap(prev => prev ?? { sites: {}, portfolioCoordinator: null, dreaming: null, reviewQueue: [] }))
      .finally(() => setRefreshing(false));
  }, []);

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
          background: 'linear-gradient(135deg, #0e1525 0%, #0a1020 60%, var(--hub-bg) 100%)',
          borderBottom: '1px solid var(--hub-border-hi)',
          boxShadow: '0 1px 20px rgba(99,102,241,0.08)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(90deg, #e2e8f0 30%, #818cf8 100%)',
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
              <button
                onClick={() => setShowSunday(s => !s)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={showSunday
                  ? { background: 'var(--hub-accent)', color: '#fff', border: '1px solid var(--hub-accent)' }
                  : { background: 'var(--hub-surface-2)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }
                }
              >
                Sunday
              </button>
              <a
                href="/content-cycle"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
              >
                Content Cycle
              </a>
              <a
                href="/plan"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--hub-cyan)', border: '1px solid rgba(34,211,238,0.25)' }}
              >
                Weekly Plan
              </a>
              <a
                href="/video-brief"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--hub-accent-dim)', color: '#a5b4fc', border: '1px solid var(--hub-border-hi)' }}
              >
                Video Brief
              </a>
              <a
                href="/guide"
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }}
              >
                Ops Guide
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

          {showSunday ? (
            <SundayView />
          ) : (
            <>
              {statusMap && Object.keys(statusMap.sites).length > 0 && (
                <PortfolioBar statusMap={statusMap.sites} portfolioCoordinator={statusMap.portfolioCoordinator} />
              )}

              {statusMap && (
                <AgentCommandCentre
                  portfolioCoordinator={statusMap.portfolioCoordinator}
                  dreaming={statusMap.dreaming}
                  sites={statusMap.sites}
                />
              )}

              <main className="flex-1 px-6 py-8">
                {/* Live control + history: what's happening now / what has happened */}
                <div className="mb-6 grid gap-5 lg:grid-cols-2">
                  <PipelineRunner />
                  <ActivityFeed />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {sites.map((site) => (
                    <SiteCard
                      key={site.id}
                      site={site}
                      status={statusMap?.sites[site.id]}
                      reviewQueue={statusMap?.reviewQueue ?? []}
                    />
                  ))}

                  <Link
                    href="/video-brief"
                    className="group block rounded-2xl p-5 transition-all hover:brightness-110"
                    style={{
                      background: 'var(--hub-surface)',
                      border: '1px solid var(--hub-border)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-1.5">
                        {['#185FA5','#1D9E75','#993C1D','#534AB7','#BA7517'].map(c => (
                          <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}80` }} />
                        ))}
                      </div>
                      <span className="text-xs transition-colors" style={{ color: 'var(--hub-text-3)' }}>Open →</span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--hub-text-1)' }}>Video Brief Generator</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hub-text-2)' }}>
                      Build a Claude Code video production prompt — script, voiceover, visuals, render &amp; metadata, end-to-end.
                    </p>
                    <div className="flex gap-1.5 mt-4 flex-wrap">
                      {['ElevenLabs', 'Higgsfield', 'FFmpeg'].map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ border: '1px solid var(--hub-border)', color: 'var(--hub-text-3)' }}
                        >{tag}</span>
                      ))}
                    </div>
                  </Link>
                </div>
                <DiPipeline />
              </main>

              <footer
                className="shrink-0 py-5"
                style={{ borderTop: '1px solid var(--hub-border)', background: 'var(--hub-surface)' }}
              >
                <p className="text-center text-xs" style={{ color: 'var(--hub-text-3)' }}>
                  Tasks saved in repo · Live · auto-refreshes every 30s
                </p>
              </footer>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
