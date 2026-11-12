"use client";

import { useState } from "react";
import TaskList from "./TaskList";
import RevenueFlow from "./RevenueFlow";
import SocialFeed from "./SocialFeed";
import OldOakTownAdmin from "./OldOakTownAdmin";
import DiPipeline from "./DiPipeline";
import type { SiteDetail } from "../api/status/route";
import { getSitePillars } from "@/agents/site-configs";
import { alpha, siteColor } from "../lib/siteColors";

function BrandAvatar({ name, color, initials }: { name: string; color: string; initials?: string }) {
  const letters = initials ?? name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      style={{ backgroundColor: color, color: 'var(--on-solid)' }}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold tracking-wide"
      aria-hidden="true"
    >
      {letters}
    </div>
  );
}

export interface MarketingChannel {
  status: 'active' | 'in_progress' | 'not_started';
  statusLabel: string;
  platform?: string;
  schedule?: string;
  cadence?: string;
  subscribers?: string;
  nextAction: string;
}

export interface MarketingPlan {
  blotato: MarketingChannel;
  beehiiv: MarketingChannel;
}

export interface Site {
  id: string;
  name: string;
  url: string;
  description: string;
  github: string;
  admin?: string;
  initials?: string;
  marketingPlan?: MarketingPlan;
  driveFolders?: { label: string; url: string }[];
}

const DEPLOY_STYLES: Record<string, { dot: string; label: string }> = {
  READY:    { dot: 'bg-ok', label: 'READY' },
  BUILDING: { dot: 'bg-warn animate-pulse', label: 'BUILDING' },
  ERROR:    { dot: 'bg-bad', label: 'ERROR' },
};

const TABS = ['Revenue', 'Outstanding', 'Marketing', 'Posts'] as const;

function fmt(n: number | null | undefined, prefix = ''): string {
  return n != null ? `${prefix}${n.toLocaleString()}` : '—';
}

const MARKETING_STATUS_STYLES = {
  active:      { dot: 'bg-ok', text: 'text-ok', bg: 'bg-ok/15' },
  in_progress: { dot: 'bg-warn',   text: 'text-warn',     bg: 'bg-warn/15' },
  not_started: { dot: 'bg-bad',     text: 'text-bad',         bg: 'bg-bad/15' },
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

export default function SiteCard({ site, status }: { site: Site; status?: SiteDetail }) {
  const [showTech,         setShowTech]         = useState(false);
  const [activeTab,        setActiveTab]        = useState(0);
  const [showReadiness,    setShowReadiness]    = useState(false);
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

  const brand = siteColor(site.id).accent;

  const deploy         = status?.deploy ?? null;
  const deployStyle    = deploy ? (DEPLOY_STYLES[deploy.state] ?? { dot: 'bg-fg-2', label: deploy.state }) : null;
  const readiness      = status?.readiness ?? [];

  const readinessOk   = readiness.filter(r => r.ok).length;
  const readinessTot  = readiness.length;

  const readinessColor = readinessTot === 0
    ? 'text-fg-2'
    : readinessOk === readinessTot
      ? 'text-ok'
      : readinessOk >= 3
        ? 'text-warn'
        : 'text-bad';

  return (
    <div
      className="flex flex-col rounded-2xl transition-all hover:brightness-105"
      style={{
        background: 'var(--hub-surface)',
        border: '1px solid var(--hub-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        style={{
          background: `linear-gradient(90deg, ${brand}, ${alpha(brand, 60)})`,
          height: '2px',
          borderRadius: '16px 16px 0 0',
          boxShadow: `0 0 12px ${alpha(brand, 38)}`,
        }}
      />
      <div
        className="flex flex-col gap-4 p-6"
        style={{ background: `linear-gradient(to bottom, ${alpha(brand, 9)} 0%, transparent 55%)` }}
      >

        {/* ── Status strip ── */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--hub-text-3)' }}>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{
                background: status ? (status.up ? 'var(--ok)' : 'var(--bad)') : 'var(--hub-text-3)',
                boxShadow: status?.up ? `0 0 6px ${alpha('var(--ok)', 50)}` : undefined,
              }}
            />
            <span style={{ color: status?.up ? 'var(--ok)' : status ? 'var(--bad)' : 'var(--hub-text-3)' }}>
              {status ? (status.up ? 'Up' : 'Down') : '—'}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: 'var(--fg-3)' }}>·</span>
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
              { label: 'Revenue', value: fmt(status.monthlyRevenue, '£'), color: 'var(--ok)' },
              { label: 'Sched.',  value: String(status.scheduledCount), color: status.scheduledCount > 0 ? 'var(--ok)' : 'var(--hub-text-3)' },
            ].map(({ label, value, color }, i) => (
              <div key={label} className="flex flex-col gap-0.5 px-3 py-2" style={{ borderRight: '1px solid var(--hub-border)' }}>
                <span className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>{label}</span>
                <span className="text-xs font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <span className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>Ready</span>
              <button
                onClick={() => setShowReadiness(s => !s)}
                className={`text-left text-xs font-semibold ${readinessColor}`}
              >
                {readinessTot > 0 ? `${readinessOk}/${readinessTot}` : '—'}
                {readinessTot > 0 && <span className="ml-1 text-[12px]">{showReadiness ? '▲' : '▼'}</span>}
              </button>
            </div>
          </div>
        )}

        {/* ── Readiness checklist ── */}
        {showReadiness && readiness.length > 0 && (
          <div className="divide-y rounded-lg border divide-line border-line">
            {readiness.map((item, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2">
                <span className={`mt-0.5 flex-shrink-0 text-xs ${item.ok ? 'text-ok' : 'text-fg-3'}`}>
                  {item.ok ? '✓' : '○'}
                </span>
                <div>
                  <p className="text-xs font-medium text-fg">{item.label}</p>
                  <p className="text-xs text-fg-3">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Site name + description ── */}
        <div className="flex items-start gap-3">
          <BrandAvatar name={site.name} color={brand} initials={site.initials} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--hub-text-1)' }}>{site.name}</h2>
              {site.id === "oldoaktown" && (
                <button
                  onClick={() => setBreakingNewsOpen(true)}
                  className="flex-shrink-0 rounded-md bg-bad px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-on-solid transition-colors hover:brightness-125"
                >
                  Breaking News
                </button>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--hub-text-2)' }}>{site.description}</p>
            {deploy?.commitMessage && (
              <p className="truncate text-xs text-fg-3" title={deploy.commitMessage}>
                {deploy.commitMessage}
              </p>
            )}
          </div>
        </div>

        {/* ── Breaking News modal (OOT only) ── */}
        {site.id === "oldoaktown" && breakingNewsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/50 p-4"
            onClick={e => { if (e.target === e.currentTarget) closeBreakingNews(); }}
          >
            <div className="w-full max-w-md rounded-2xl p-6 shadow-xl bg-panel">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-fg">
                  Breaking News Brief
                </h3>
                <button
                  onClick={closeBreakingNews}
                  className="text-fg-2 transition-colors hover:text-fg"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg">
                    Paste the story headline and summary
                  </label>
                  <textarea
                    value={story}
                    onChange={e => setStory(e.target.value)}
                    rows={4}
                    placeholder="Story headline and summary…"
                    className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:border-line-2 focus:outline-none border-line-2 bg-panel-2 text-fg placeholder-fg-3"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-fg">
                    Source URL
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:border-line-2 focus:outline-none border-line-2 bg-panel-2 text-fg placeholder-fg-3"
                  />
                </div>
                <button
                  onClick={generateBrief}
                  disabled={!story.trim()}
                  className="rounded-lg bg-bad px-4 py-2 text-sm font-medium text-on-solid transition-colors hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Generate brief
                </button>
                {copied && (
                  <p className="text-sm font-medium text-ok">
                    Brief copied to clipboard. Paste it into Cowork now.
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
            style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--hub-border-hi)' }}
          >
            Visit →
          </a>
        </div>

        {/* ── Old Oak Town admin: pending approvals + business promotion (OOT only) ── */}
        {site.id === "oldoaktown" && <OldOakTownAdmin />}

        {/* ── Task list ── */}
        <TaskList siteId={site.id} />

        {/* ── Didi's consulting deal pipeline (didianolue.co.uk only — not content operations) ── */}
        {site.id === "didianolue" && <DiPipeline />}
      </div>

      {/* ── Technical section ── */}
      <div style={{ borderTop: '1px solid var(--hub-border)' }}>
        <button
          onClick={() => setShowTech(t => !t)}
          aria-expanded={showTech}
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
                { href: `/social#${site.id}`, label: 'Socials →' },
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
                  ? { borderBottom: '2px solid var(--hub-accent)', color: 'var(--hub-accent-text)', marginBottom: '-1px' }
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
                    <span className="text-[12px] uppercase tracking-wide text-fg-3">Revenue Source</span>
                    <span className="text-xs font-medium text-fg">
                      {status.revenueConfig.label}
                      <span className="ml-1 font-normal text-fg-3">· {status.revenueConfig.source.replace(/_/g, ' ')}</span>
                      {status.revenueConfig.workshopPrice !== undefined && (
                        <span className="ml-1 text-ok">· £{status.revenueConfig.workshopPrice}/booking</span>
                      )}
                    </span>
                    {status.revenueConfig.notes && (
                      <span className="text-xs text-fg-3">{status.revenueConfig.notes}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 1 — Outstanding */}
            {activeTab === 1 && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg px-3 py-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                    <p className="text-[12px] uppercase tracking-wide text-fg-3">Overdue Follow-ups</p>
                    <p className={`mt-1 text-2xl font-bold ${(status.outstanding.overdueFollowUps ?? 0) > 0 ? 'text-bad' : 'text-fg-2'}`}>
                      {status.outstanding.overdueFollowUps}
                    </p>
                  </div>
                  <div className="rounded-lg px-3 py-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                    <p className="text-[12px] uppercase tracking-wide text-fg-3">Awaiting Approval</p>
                    <p className={`mt-1 text-2xl font-bold ${(status.outstanding.awaitingApproval ?? 0) > 0 ? 'text-warn' : 'text-fg-2'}`}>
                      {status.outstanding.awaitingApproval}
                    </p>
                  </div>
                </div>
                {status.outstanding.overdueFollowUps === 0 && status.outstanding.awaitingApproval === 0 && (
                  <p className="text-center text-xs text-fg-3">
                    Nothing outstanding — run agents to populate
                  </p>
                )}

              </div>
            )}

            {/* Tab 2 — Marketing */}
            {activeTab === 2 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                  <span className="text-xs text-fg-2">Content scheduled this week</span>
                  <span className={`text-sm font-bold ${status.scheduledCount > 0 ? 'text-ok' : 'text-fg-2'}`}>
                    {status.scheduledCount}
                  </span>
                </div>

                {/* ── Marketing Plan (static, read-only) ── */}
                {site.marketingPlan && (
                  <div className="flex flex-col gap-3 border-t pt-4 border-line">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-fg-3">
                      Marketing Plan
                    </span>

                    {/* Blotato */}
                    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-fg">Blotato (Social Media)</span>
                        <MarketingStatusPill status={site.marketingPlan.blotato.status} label={site.marketingPlan.blotato.statusLabel} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {site.marketingPlan.blotato.platform && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] uppercase tracking-wide text-fg-3">Platform</span>
                            <span className="text-xs font-medium text-fg">{site.marketingPlan.blotato.platform}</span>
                          </div>
                        )}
                        {site.marketingPlan.blotato.schedule && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] uppercase tracking-wide text-fg-3">Schedule</span>
                            <span className="text-xs font-medium text-fg">{site.marketingPlan.blotato.schedule}</span>
                          </div>
                        )}
                      </div>
                      {getSitePillars(site.id).length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[12px] uppercase tracking-wide text-fg-3">Content Pillars</span>
                          <div className="flex flex-wrap gap-1">
                            {getSitePillars(site.id).map(pillar => (
                              <span key={pillar.id} className="rounded-md px-2 py-0.5 text-[12px] font-medium bg-panel-3 text-fg">
                                {pillar.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 bg-panel-3/50">
                        <span className="text-[12px] uppercase tracking-wide text-fg-3">Next Action</span>
                        <span className="text-xs text-fg">{site.marketingPlan.blotato.nextAction}</span>
                      </div>
                    </div>

                    {/* Beehiiv */}
                    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-fg">Beehiiv (Email Marketing)</span>
                        <MarketingStatusPill status={site.marketingPlan.beehiiv.status} label={site.marketingPlan.beehiiv.statusLabel} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {site.marketingPlan.beehiiv.cadence && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] uppercase tracking-wide text-fg-3">Cadence</span>
                            <span className="text-xs font-medium text-fg">{site.marketingPlan.beehiiv.cadence}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] uppercase tracking-wide text-fg-3">Subscribers</span>
                          <span className="text-xs font-medium text-fg">{site.marketingPlan.beehiiv.subscribers ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 bg-panel-3/50">
                        <span className="text-[12px] uppercase tracking-wide text-fg-3">Next Action</span>
                        <span className="text-xs text-fg">{site.marketingPlan.beehiiv.nextAction}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3 — Posts (live from Blotato) */}
            {activeTab === 3 && (
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
