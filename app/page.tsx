"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteCard from "./components/SiteCard";
import DailyBriefing from "./components/DailyBriefing";
import AgentCommandCentre from "./components/AgentCommandCentre";
import SidebarTasks from "./components/SidebarTasks";
import DiPipeline from "./components/DiPipeline";
import SundayView from "./components/SundayView";
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

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Portfolio
        </span>

        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">Revenue</span>
          <span className={`font-semibold ${totalRevenue !== null ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
            {totalRevenue !== null ? `£${totalRevenue.toLocaleString()}/mo` : '—'}
          </span>
        </span>

        <span className="text-zinc-200 dark:text-zinc-700">|</span>

        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">Active agents</span>
          <span className={`font-semibold ${activeAgents > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
            {activeAgents}
          </span>
        </span>

        <span className="text-zinc-200 dark:text-zinc-700">|</span>

        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">Outstanding</span>
          <span className={`font-semibold ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`}>
            {outstanding}{outstanding > 0 && ' ⚠'}
          </span>
        </span>

        <span className="text-zinc-200 dark:text-zinc-700">|</span>

        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">Scheduled</span>
          <span className={`font-semibold ${scheduled > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
            {scheduled} posts
          </span>
        </span>

        <span className="text-zinc-200 dark:text-zinc-700">|</span>

        <span className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-400 dark:text-zinc-500">Batch</span>
          <span className={`font-semibold ${
            (portfolioCoordinator?.batchStatus.approved ?? 0) === 5
              ? 'text-emerald-600 dark:text-emerald-400'
              : (portfolioCoordinator?.batchStatus.approved ?? 0) > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-zinc-400'
          }`}>
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

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(setStatusMap)
      .catch(() => setStatusMap({ sites: {}, portfolioCoordinator: null, dreaming: null, reviewQueue: [] }));
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Command Hub
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Didi Anolue · {sites.length} sites
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSunday(s => !s)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showSunday
                    ? "border-zinc-800 bg-zinc-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                Sunday
              </button>
              <a
                href="/plan"
                className="rounded-lg border border-blue-400 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
              >
                Weekly Plan
              </a>
              <a
                href="/video-brief"
                className="rounded-lg border border-violet-400 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
              >
                Video Brief
              </a>
              <a
                href="/guide"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Operations Guide
              </a>
              <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                {statusMap === null ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-600" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${Object.values(statusMap.sites).every(s => s.up) ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                )}
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {statusMap === null ? 'Checking…' : `${Object.values(statusMap.sites).filter(s => s.up).length}/${sites.length} up`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — fixed width, always visible */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {statusMap !== null && <DailyBriefing statusMap={statusMap} />}
          <SidebarTasks />
        </aside>

        {/* Right main area — scrolls independently */}
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
                <div className="grid gap-6 sm:grid-cols-2">
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
                    className="group block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex gap-1">
                          {['#185FA5','#1D9E75','#993C1D','#534AB7','#BA7517'].map(c => (
                            <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">Open →</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Video Brief Generator</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Build a Claude Code video production prompt — script, voiceover, visuals, render &amp; metadata, end-to-end.
                    </p>
                    <div className="flex gap-1.5 mt-4 flex-wrap">
                      {['ElevenLabs', 'Higgsfield', 'FFmpeg'].map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500">{tag}</span>
                      ))}
                    </div>
                  </Link>
                </div>
                <DiPipeline />
              </main>

              <footer className="shrink-0 border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
                  Tasks saved in repo · Status refreshes on load
                </p>
              </footer>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
