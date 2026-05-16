"use client";

import { useState } from "react";
import TaskList from "./TaskList";
import RevenueFlow from "./RevenueFlow";
import SocialFeed from "./SocialFeed";
import type { SiteDetail, DraftItem } from "../api/status/route";

function getBrandTextOnColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1c1c1c' : '#ffffff';
}

function BrandAvatar({ name, color, initials }: { name: string; color: string; initials?: string }) {
  const letters = initials ?? name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      style={{ backgroundColor: color, color: getBrandTextOnColor(color) }}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-wide"
      aria-hidden="true"
    >
      {letters}
    </div>
  );
}

interface MarketingChannel {
  status: 'active' | 'in_progress' | 'not_started';
  statusLabel: string;
  platform?: string;
  schedule?: string;
  cadence?: string;
  contentPillars?: string[];
  subscribers?: string;
  nextAction: string;
}

interface MarketingPlan {
  blotato: MarketingChannel;
  beehiiv: MarketingChannel;
}

interface Site {
  id: string;
  name: string;
  url: string;
  description: string;
  github: string;
  admin?: string;
  socialAgent?: string;
  brandColor?: string;
  initials?: string;
  marketingPlan?: MarketingPlan;
}

const DEPLOY_STYLES: Record<string, { dot: string; label: string }> = {
  READY:    { dot: 'bg-emerald-400', label: 'READY' },
  BUILDING: { dot: 'bg-amber-400 animate-pulse', label: 'BUILDING' },
  ERROR:    { dot: 'bg-red-400', label: 'ERROR' },
};

const SUBAGENT_PILL: Record<string, string> = {
  idle:      'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
  running:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse',
  complete:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  error:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  never_run: 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
};

const GRADER_PILL: Record<string, string> = {
  pass:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  fail:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  retry: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const SITE_RUBRIC: Record<string, { pass: string[]; fail: string }> = {
  didianolue: {
    pass: [
      'Communicates full-lifecycle procurement authority',
      'Speaks to senior commercial or public-sector audiences',
      'Contains a clear next step (contact, consult, connect)',
    ],
    fail: 'Fails if generic — no specific domain expertise visible',
  },
  masteryourcareerpath: {
    pass: [
      'Reinforces or references PRIME or OPERATE frameworks',
      'Speaks to professionals seeking career transformation',
      'Includes a path to Skool community, course, or cohort',
    ],
    fail: 'Fails if frameworks are absent or unnamed',
  },
  theconcurrentcontractor: {
    pass: [
      'Written through the lens of a practising UK IT contractor',
      'Addresses IR35, rate strategy, or market intel',
      'Practical and peer-to-peer in tone — not advisory',
    ],
    fail: 'Fails if it reads as generic career or recruitment content',
  },
  oldoaktown: {
    pass: [
      'Every factual claim is verifiable — no invented businesses or events',
      'Rooted in Old Oak Common or Park Royal regeneration area',
      'Hyperlocal voice — community-first, not corporate',
    ],
    fail: 'Fails on any fabricated local detail — zero tolerance',
  },
  aiviralvideoprompts: {
    pass: [
      'Contains a clear conversion action (link, CTA, offer)',
      'Hook lands in the first line — no warm-up sentences',
      'Addresses a specific creator pain point, not generic AI hype',
      'Platform-appropriate length and format',
    ],
    fail: 'Fails if no specific prompt example is included',
  },
};

const TABS = ['Revenue', 'Agents', 'Pipeline', 'Outstanding', 'Marketing', 'Posts'] as const;

function fmt(n: number | null | undefined, prefix = ''): string {
  return n != null ? `${prefix}${n.toLocaleString()}` : '—';
}

const MARKETING_STATUS_STYLES = {
  active:      { dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  in_progress: { dot: 'bg-amber-400',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
  not_started: { dot: 'bg-red-400',     text: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
} as const;

function MarketingStatusPill({ status, label }: { status: keyof typeof MARKETING_STATUS_STYLES; label: string }) {
  const s = MARKETING_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'never_run') return <span className="text-xs text-zinc-400">Never run</span>;
  if (status === 'error')     return <span className="text-xs font-medium text-red-500">Error</span>;
  return <span className="text-xs font-medium text-emerald-500">Active</span>;
}

export default function SiteCard({ site, status, reviewQueue = [] }: { site: Site; status?: SiteDetail; reviewQueue?: DraftItem[] }) {
  const [expanded,      setExpanded]      = useState(false);
  const [activeTab,     setActiveTab]     = useState(0);
  const [showReadiness, setShowReadiness] = useState(false);
  const [showRubric,    setShowRubric]    = useState(false);

  const siteReviewQueue = reviewQueue.filter(item => item.siteId === site.id);

  const deploy         = status?.deploy ?? null;
  const deployStyle    = deploy ? (DEPLOY_STYLES[deploy.state] ?? { dot: 'bg-zinc-400', label: deploy.state }) : null;
  const revenue        = status?.revenue ?? null;
  const agentSummaries = status?.agentSummaries ?? [];
  const readiness      = status?.readiness ?? [];
  const coordinator    = status?.coordinator ?? null;

  const activeAgents  = agentSummaries.filter(a => a.status !== 'never_run').length;
  const totalAgents   = agentSummaries.length;
  const agentLabel    = totalAgents > 0 ? `${activeAgents}/${totalAgents}` : null;
  const readinessOk   = readiness.filter(r => r.ok).length;
  const readinessTot  = readiness.length;

  const readinessColor = readinessTot === 0
    ? 'text-zinc-400'
    : readinessOk === readinessTot
      ? 'text-emerald-600 dark:text-emerald-400'
      : readinessOk >= 3
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-500 dark:text-red-400';

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      {site.brandColor && (
        <div style={{ backgroundColor: site.brandColor }} className="h-1.5 w-full flex-shrink-0 rounded-t-2xl" />
      )}
      <div
        className="flex flex-col gap-4 p-6"
        style={site.brandColor ? { background: `linear-gradient(to bottom, ${site.brandColor}18 0%, transparent 55%)` } : undefined}
      >

        {/* ── Status strip ── */}
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${status ? (status.up ? 'bg-emerald-400' : 'bg-red-400') : 'bg-zinc-300 dark:bg-zinc-600'}`} />
            {status ? (status.up ? 'Up' : 'Down') : '—'}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          {deployStyle ? (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${deployStyle.dot}`} />
              {deployStyle.label}
              {deploy?.ago && <span className="text-zinc-400 dark:text-zinc-600">{deploy.ago}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full flex-shrink-0 bg-zinc-300 dark:bg-zinc-600" />
              {status && !deploy ? 'No deploy' : '—'}
            </span>
          )}
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>
            Agents: <span className={activeAgents > 0 ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'}>{agentLabel ?? '—'}</span>
          </span>
        </div>

        {/* ── Info row ── */}
        {status && (
          <div className="grid grid-cols-4 divide-x divide-zinc-100 rounded-lg bg-zinc-50 dark:divide-zinc-800 dark:bg-zinc-800">
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Revenue</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {fmt(status.monthlyRevenue, '£')}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Agents</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{agentLabel ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Activity</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{status.lastActivity ?? '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Ready</span>
              <button
                onClick={() => setShowReadiness(s => !s)}
                className={`text-left text-xs font-semibold ${readinessColor}`}
              >
                {readinessTot > 0 ? `${readinessOk}/${readinessTot}` : '—'}
                {readinessTot > 0 && <span className="ml-1 text-[10px]">{showReadiness ? '▲' : '▼'}</span>}
              </button>
            </div>
          </div>
        )}

        {/* ── Readiness checklist ── */}
        {showReadiness && readiness.length > 0 && (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
            {readiness.map((item, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-0.5 flex-shrink-0 text-xs ${item.ok ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600'}`}>
                  {item.ok ? '✓' : '○'}
                </span>
                <div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.label}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Site name + description ── */}
        <div className="flex items-start gap-3">
          {site.brandColor && (
            <BrandAvatar name={site.name} color={site.brandColor} initials={site.initials} />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{site.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{site.description}</p>
            {deploy?.commitMessage && (
              <p className="truncate text-xs text-zinc-400 dark:text-zinc-600" title={deploy.commitMessage}>
                {deploy.commitMessage}
              </p>
            )}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-2">
          <a href={site.github} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
            GitHub
          </a>
          {site.admin && (
            <a href={site.admin} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              Admin
            </a>
          )}
          {site.socialAgent && (
            <a href={site.socialAgent} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-500 dark:border-zinc-800 dark:text-zinc-600 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-500">
              Legacy Social Agent
            </a>
          )}
          {status && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
              {expanded ? 'Less ↑' : 'More ↓'}
            </button>
          )}
          <a href={`https://${site.url}`} target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            Visit →
          </a>
        </div>

        {/* ── URL pill ── */}
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">URL</span>
          <span className="font-mono text-sm text-zinc-600 dark:text-zinc-300">{site.url}</span>
        </div>

        {/* ── Task list ── */}
        <TaskList siteId={site.id} />
      </div>

      {/* ── Expanded panel ── */}
      {expanded && status && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">

          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-zinc-100 scrollbar-none dark:border-zinc-800">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === i
                    ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* Tab 0 — Revenue */}
            {activeTab === 0 && (
              <div className="flex flex-col gap-4">
                <RevenueFlow siteId={site.id} />
                {status.revenueConfig && (
                  <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Revenue Source</span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {status.revenueConfig.label}
                      <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">· {status.revenueConfig.source.replace(/_/g, ' ')}</span>
                      {status.revenueConfig.workshopPrice !== undefined && (
                        <span className="ml-1 text-emerald-600 dark:text-emerald-400">· £{status.revenueConfig.workshopPrice}/booking</span>
                      )}
                    </span>
                    {status.revenueConfig.notes && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">{status.revenueConfig.notes}</span>
                    )}
                  </div>
                )}
                {revenue ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                    {revenue.model === 'consulting' ? (
                      <>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {revenue.pipelineValue !== undefined ? `£${revenue.pipelineValue.toLocaleString()} pipeline` : 'Pipeline: —'}
                        </span>
                        <span className={`text-xs ${(revenue.activeEnquiries ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {fmt(revenue.activeEnquiries)} enquiries
                        </span>
                        <span className={`text-xs ${(revenue.overdueFollowUps ?? 0) > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {fmt(revenue.overdueFollowUps)} overdue
                        </span>
                        <span className={`text-xs ${(revenue.meetingsBooked ?? 0) > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
                          {fmt(revenue.meetingsBooked)} meetings
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Revenue source not yet connected — agents not run
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">No revenue data</p>
                )}
              </div>
            )}

            {/* Tab 1 — Agent Activity */}
            {activeTab === 1 && (
              <div className="flex flex-col gap-4">

                {/* Pipeline Agents */}
                {(status.subagentStatus || status.graderVerdict) && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Pipeline Agents</p>
                    {status.subagentStatus && (
                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Subagent</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SUBAGENT_PILL[status.subagentStatus.status] ?? SUBAGENT_PILL.never_run}`}>
                          {status.subagentStatus.status.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {status.graderVerdict && (
                      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Grader</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          status.graderVerdict.verdict !== 'never_run'
                            ? (GRADER_PILL[status.graderVerdict.verdict] ?? '')
                            : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                        }`}>
                          {status.graderVerdict.verdict.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy Agents */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Legacy Agents</p>
                  {agentSummaries.length === 0 ? (
                    <p className="text-xs text-zinc-400">No agent data available</p>
                  ) : agentSummaries.map(agent => (
                    <div key={agent.name} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                      <div>
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{agent.displayName}</p>
                        {agent.lastAction && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">{agent.lastAction}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {agent.ago && <span className="text-xs text-zinc-400">{agent.ago}</span>}
                        <StatusBadge status={agent.status} />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Tab 2 — Pipeline */}
            {activeTab === 2 && (
              <div className="flex flex-col gap-4">

                {/* Section 1 — Subagent */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Subagent</p>
                  {status.subagentStatus ? (
                    <>
                      <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${SUBAGENT_PILL[status.subagentStatus.status] ?? SUBAGENT_PILL.never_run}`}>
                        {status.subagentStatus.status.replace('_', ' ')}
                      </span>
                      {status.subagentStatus.briefGenerated && status.subagentStatus.briefSummary ? (
                        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Brief this week</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300">{status.subagentStatus.briefSummary}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">No brief generated yet — lead coordinator has not run</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">No brief generated yet — lead coordinator has not run</p>
                  )}
                </div>

                {/* Section 2 — Grader */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Outcomes Grader{status.graderVerdict ? ` · ${status.graderVerdict.rubricName}` : ''}
                  </p>
                  {status.graderVerdict && status.graderVerdict.verdict !== 'never_run' ? (
                    <>
                      <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${GRADER_PILL[status.graderVerdict.verdict] ?? ''}`}>
                        {status.graderVerdict.verdict}
                      </span>
                      {status.graderVerdict.retryCount > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Retried {status.graderVerdict.retryCount} time(s)
                        </p>
                      )}
                      {status.graderVerdict.failedCriterion && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-400">Failed Criterion</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{status.graderVerdict.failedCriterion}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Grader has not run yet</p>
                  )}
                </div>

                {/* Section 3 — Rubric criteria (collapsible) */}
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <button
                    onClick={() => setShowRubric(r => !r)}
                    className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                  >
                    Rubric {showRubric ? '▲' : '▼'}
                  </button>
                  {showRubric && (
                    <div className="mt-2 flex flex-col gap-1">
                      {(SITE_RUBRIC[site.id]?.pass ?? []).map((criterion, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 flex-shrink-0 font-medium text-emerald-500">✓</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{criterion}</span>
                        </div>
                      ))}
                      {SITE_RUBRIC[site.id]?.fail && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="mt-0.5 flex-shrink-0 font-medium text-red-500">✗</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{SITE_RUBRIC[site.id].fail}</span>
                        </div>
                      )}
                      {!SITE_RUBRIC[site.id] && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">No rubric defined for this site</p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tab 3 — Outstanding */}
            {activeTab === 3 && (
              <div id="review-queue" className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-50 px-3 py-3 dark:bg-zinc-800">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Overdue Follow-ups</p>
                    <p className={`mt-1 text-2xl font-bold ${(status.outstanding.overdueFollowUps ?? 0) > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      {status.outstanding.overdueFollowUps}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-3 dark:bg-zinc-800">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Awaiting Approval</p>
                    <p className={`mt-1 text-2xl font-bold ${(status.outstanding.awaitingApproval ?? 0) > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>
                      {status.outstanding.awaitingApproval}
                    </p>
                  </div>
                </div>
                {status.outstanding.overdueFollowUps === 0 && status.outstanding.awaitingApproval === 0 && (
                  <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Nothing outstanding — run agents to populate
                  </p>
                )}

                {/* Review Queue */}
                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Review Queue</p>
                  {siteReviewQueue.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">Nothing awaiting review</p>
                  ) : siteReviewQueue.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {item.platform}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GRADER_PILL[item.graderVerdict] ?? ''}`}>
                          {item.graderVerdict}
                        </span>
                        {item.retryCount > 0 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Retry ×{item.retryCount}</span>
                        )}
                      </div>
                      {item.failedCriterion && (
                        <div className="rounded-md bg-red-50 px-2 py-1.5 dark:bg-red-900/20">
                          <p className="text-xs text-red-700 dark:text-red-300">
                            <span className="font-medium">Failed criterion: </span>&ldquo;{item.failedCriterion}&rdquo;
                          </p>
                        </div>
                      )}
                      {item.contentSnippet && (
                        <div className="rounded-md bg-zinc-50 px-2 py-1.5 dark:bg-zinc-800">
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">Preview: </span>
                            &ldquo;{item.contentSnippet.slice(0, 80)}{item.contentSnippet.length > 80 ? '…' : ''}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* Tab 4 — Marketing Assets */}
            {activeTab === 4 && (
              <div className="flex flex-col gap-3">
                {coordinator ? (
                  <>
                    {coordinator.weekCommencing && (
                      <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Week Commencing</span>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{coordinator.weekCommencing}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Weekly Theme</span>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{coordinator.weeklyTheme}</span>
                    </div>
                    {coordinator.campaignObjective && (
                      <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Campaign Objective</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-300">{coordinator.campaignObjective}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    No coordinator data — run the Social Agent to set the weekly theme
                  </p>
                )}
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Content scheduled this week</span>
                  <span className={`text-sm font-bold ${status.scheduledCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                    {status.scheduledCount}
                  </span>
                </div>

                {/* ── Marketing Plan (static, read-only) ── */}
                {site.marketingPlan && (
                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Marketing Plan
                    </span>

                    {/* Blotato */}
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Blotato (Social Media)</span>
                        <MarketingStatusPill status={site.marketingPlan.blotato.status} label={site.marketingPlan.blotato.statusLabel} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {site.marketingPlan.blotato.platform && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Platform</span>
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{site.marketingPlan.blotato.platform}</span>
                          </div>
                        )}
                        {site.marketingPlan.blotato.schedule && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Schedule</span>
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{site.marketingPlan.blotato.schedule}</span>
                          </div>
                        )}
                      </div>
                      {site.marketingPlan.blotato.contentPillars && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Content Pillars</span>
                          <div className="flex flex-wrap gap-1">
                            {site.marketingPlan.blotato.contentPillars.map((pillar, i) => (
                              <span key={i} className="rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                {pillar}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 rounded-md bg-zinc-100 px-2 py-1.5 dark:bg-zinc-700/50">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Next Action</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-300">{site.marketingPlan.blotato.nextAction}</span>
                      </div>
                    </div>

                    {/* Beehiiv */}
                    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Beehiiv (Email Marketing)</span>
                        <MarketingStatusPill status={site.marketingPlan.beehiiv.status} label={site.marketingPlan.beehiiv.statusLabel} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {site.marketingPlan.beehiiv.cadence && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Cadence</span>
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{site.marketingPlan.beehiiv.cadence}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Subscribers</span>
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{site.marketingPlan.beehiiv.subscribers ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 rounded-md bg-zinc-100 px-2 py-1.5 dark:bg-zinc-700/50">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Next Action</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-300">{site.marketingPlan.beehiiv.nextAction}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5 — Posts (live from Blotato) */}
            {activeTab === 5 && (
              <SocialFeed siteId={site.id} />
            )}

          </div>
        </div>
      )}
    </div>
  );
}
