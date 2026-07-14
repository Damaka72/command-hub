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
  driveFolders?: { label: string; url: string }[];
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

export default function SiteCard({ site, status, reviewQueue = [] }: { site: Site; status?: SiteDetail; reviewQueue?: DraftItem[] }) {
  const [showTech,         setShowTech]         = useState(false);
  const [activeTab,        setActiveTab]        = useState(0);
  const [showReadiness,    setShowReadiness]    = useState(false);
  const [showRubric,       setShowRubric]       = useState(false);
  const [breakingNewsOpen, setBreakingNewsOpen] = useState(false);
  const [story,            setStory]            = useState("");
  const [source,           setSource]           = useState("");
  const [copied,           setCopied]           = useState(false);

  function closeBreakingNews() {
    setBreakingNewsOpen(false);
    setStory("");
    setSource("");
    setCopied(false);
  }

  function generateBrief() {
    const text = `BREAKING NEWS BRIEF Story: ${story} Source: ${source} Generate same-day content for LinkedIn, Facebook, and Instagram Story. Mark URGENT. I need to approve within the hour.`;
    navigator.clipboard.writeText(text).catch(() => {}).finally(() => setCopied(true));
  }

  const siteReviewQueue = reviewQueue.filter(item => item.siteId === site.id);

  const deploy         = status?.deploy ?? null;
  const deployStyle    = deploy ? (DEPLOY_STYLES[deploy.state] ?? { dot: 'bg-zinc-400', label: deploy.state }) : null;
  const readiness      = status?.readiness ?? [];
  const coordinator    = status?.coordinator ?? null;

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
    <div
      className="flex flex-col rounded-2xl transition-all hover:brightness-105"
      style={{
        background: 'var(--hub-surface)',
        border: '1px solid var(--hub-border)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      {site.brandColor && (
        <div
          style={{
            background: `linear-gradient(90deg, ${site.brandColor}, ${site.brandColor}99)`,
            height: '2px',
            borderRadius: '16px 16px 0 0',
            boxShadow: `0 0 12px ${site.brandColor}60`,
          }}
        />
      )}
      <div
        className="flex flex-col gap-4 p-6"
        style={site.brandColor ? { background: `linear-gradient(to bottom, ${site.brandColor}18 0%, transparent 55%)` } : undefined}
      >

        {/* ── Status strip ── */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--hub-text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{
                background: status ? (status.up ? '#10b981' : '#f87171') : 'var(--hub-text-3)',
                boxShadow: status?.up ? '0 0 6px rgba(16,185,129,0.5)' : undefined,
              }}
            />
            <span style={{ color: status?.up ? '#34d399' : status ? '#f87171' : 'var(--hub-text-3)' }}>
              {status ? (status.up ? 'Up' : 'Down') : '—'}
            </span>
          </span>
          <span style={{ color: 'var(--hub-border-hi)' }}>·</span>
          {deployStyle ? (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${deployStyle.dot}`} />
              {deployStyle.label}
              {deploy?.ago && <span style={{ color: 'var(--hub-text-3)' }}>{deploy.ago}</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'var(--hub-text-3)' }} />
              {status && !deploy ? 'No deploy' : '—'}
            </span>
          )}
        </div>

        {/* ── Info row ── */}
        {status && (
          <div
            className="grid grid-cols-3 rounded-lg overflow-hidden"
            style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}
          >
            {[
              { label: 'Revenue', value: fmt(status.monthlyRevenue, '£'), color: '#34d399' },
              { label: 'Sched.',  value: String(status.scheduledCount), color: status.scheduledCount > 0 ? '#34d399' : 'var(--hub-text-3)' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="flex flex-col gap-0.5 px-3 py-2" style={{ borderRight: '1px solid var(--hub-border)' }}>
                <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>{label}</span>
                <span className="text-xs font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>Ready</span>
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--hub-text-1)' }}>{site.name}</h2>
              {site.id === "oldoaktown" && (
                <button
                  onClick={() => setBreakingNewsOpen(true)}
                  className="flex-shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700"
                >
                  Breaking News
                </button>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--hub-text-2)' }}>{site.description}</p>
            {deploy?.commitMessage && (
              <p className="truncate text-xs text-zinc-400 dark:text-zinc-600" title={deploy.commitMessage}>
                {deploy.commitMessage}
              </p>
            )}
          </div>
        </div>

        {/* ── Breaking News modal (OOT only) ── */}
        {site.id === "oldoaktown" && breakingNewsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={e => { if (e.target === e.currentTarget) closeBreakingNews(); }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Breaking News Brief
                </h3>
                <button
                  onClick={closeBreakingNews}
                  className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Paste the story headline and summary
                  </label>
                  <textarea
                    value={story}
                    onChange={e => setStory(e.target.value)}
                    rows={4}
                    placeholder="Story headline and summary…"
                    className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder-zinc-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Source URL
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder-zinc-500"
                  />
                </div>
                <button
                  onClick={generateBrief}
                  disabled={!story.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate brief
                </button>
                {copied && (
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Brief copied to clipboard — paste into OOT Coordinator now.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── URL pill + Visit ── */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--hub-text-3)' }}>URL</span>
          <span className="flex-1 font-mono text-sm" style={{ color: 'var(--hub-text-2)' }}>{site.url}</span>
          <a
            href={`https://${site.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
            style={{ background: 'var(--hub-accent-dim)', color: '#a5b4fc', border: '1px solid var(--hub-border-hi)' }}
          >
            Visit →
          </a>
        </div>

        {/* ── Task list ── */}
        <TaskList siteId={site.id} />
      </div>

      {/* ── Technical section ── */}
      <div style={{ borderTop: '1px solid var(--hub-border)' }}>
        <button
          onClick={() => setShowTech(t => !t)}
          className="flex w-full items-center justify-between px-6 py-3 text-xs font-medium transition-colors hover:brightness-125"
          style={{ color: 'var(--hub-text-3)' }}
        >
          <span>Technical</span>
          <span>{showTech ? '↑' : '↓'}</span>
        </button>

        {showTech && (
          <div style={{ borderTop: '1px solid var(--hub-border)' }}>

            {/* Links */}
            <div className="flex flex-wrap gap-2 px-6 py-4">
              {[
                site.github && { href: site.github, label: 'GitHub' },
                site.admin  && { href: site.admin,  label: 'Admin' },
                site.socialAgent && { href: site.socialAgent, label: 'Legacy Agent', muted: true },
              ].filter(Boolean).map((link: any) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                  style={{
                    border: '1px solid var(--hub-border)',
                    color: link.muted ? 'var(--hub-text-3)' : 'var(--hub-text-2)',
                    background: 'var(--hub-surface-2)',
                  }}
                >
                  {link.label}
                </a>
              ))}
              {site.driveFolders?.map(d => (
                <a
                  key={d.label}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                  style={{
                    border: '1px solid var(--hub-border)',
                    color: 'var(--hub-text-2)',
                    background: 'var(--hub-surface-2)',
                  }}
                >
                  📁 {d.label}
                </a>
              ))}
            </div>

            {/* Detail tabs — only when status data is available */}
            {status && (
              <>
          {/* Tab bar */}
          <div className="flex flex-wrap" style={{ borderBottom: '1px solid var(--hub-border)' }}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className="whitespace-nowrap px-3 py-2.5 text-xs font-medium transition-all"
                style={activeTab === i
                  ? { borderBottom: '2px solid var(--hub-accent)', color: '#a5b4fc', marginBottom: '-1px' }
                  : { color: 'var(--hub-text-3)' }
                }
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
                  <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                      <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Subagent</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SUBAGENT_PILL[status.subagentStatus.status] ?? SUBAGENT_PILL.never_run}`}>
                          {status.subagentStatus.status.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {status.graderVerdict && (
                      <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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

                {!status.subagentStatus && !status.graderVerdict && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">No pipeline activity yet — run the pipeline to populate</p>
                )}

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
                        <div className="rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                  <div className="rounded-lg px-3 py-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Overdue Follow-ups</p>
                    <p className={`mt-1 text-2xl font-bold ${(status.outstanding.overdueFollowUps ?? 0) > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      {status.outstanding.overdueFollowUps}
                    </p>
                  </div>
                  <div className="rounded-lg px-3 py-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                        <div className="rounded-md px-2 py-1.5" style={{ background: 'var(--hub-surface-2)' }}>
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
                      <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Week Commencing</span>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{coordinator.weekCommencing}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Weekly Theme</span>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{coordinator.weeklyTheme}</span>
                    </div>
                    {coordinator.campaignObjective && (
                      <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
                    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
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
            </>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
