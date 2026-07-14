"use client";

import { useState } from "react";
import type { PortfolioCoordinator, DreamingStatus, SiteDetail } from "../api/status/route";
import { SITE_SHORT } from "../lib/siteConstants";

const SITE_ORDER = [
  'masteryourcareerpath',
  'theconcurrentcontractor',
  'oldoaktown',
  'aiviralvideoprompts',
] as const;

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

const SUBAGENT_PILL: Record<string, { bg: string; color: string; extra?: string }> = {
  idle:      { bg: 'rgba(71,85,105,0.3)',  color: '#94a3b8' },
  running:   { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', extra: 'animate-pulse' },
  complete:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  error:     { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  never_run: { bg: 'rgba(30,41,59,0.6)',   color: '#475569' },
};

const GRADER_PILL: Record<string, { bg: string; color: string }> = {
  pass:  { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  fail:  { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  retry: { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
};

interface Props {
  portfolioCoordinator: PortfolioCoordinator | null;
  dreaming: DreamingStatus | null;
  sites: Record<string, SiteDetail>;
}

export default function AgentCommandCentre({ portfolioCoordinator, dreaming, sites }: Props) {
  const [dreamingOpen, setDreamingOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--hub-border)', background: 'var(--hub-surface)' }}>
      <div className="mx-auto max-w-6xl px-6 py-4">

        <div className="flex gap-6">

          {/* Lead Coordinator */}
          <div className="w-1/4 min-w-0 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
              Lead Coordinator
            </p>
            <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--hub-text-3)' }}>
              content-coordinator.json
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs" style={{ color: 'var(--hub-text-3)' }}>Last run</span>
                <span className="text-xs font-medium" style={{ color: 'var(--hub-text-2)' }}>
                  {relativeTime(portfolioCoordinator?.lastRun ?? null)}
                </span>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--hub-text-3)' }}>Theme </span>
                <span className="text-xs font-medium" style={{ color: portfolioCoordinator?.weeklyTheme ? 'var(--hub-text-1)' : 'var(--hub-text-3)' }}>
                  {portfolioCoordinator?.weeklyTheme ?? 'Not set'}
                </span>
              </div>
              {portfolioCoordinator?.campaignObjective && (
                <p className="text-xs leading-snug" style={{ color: 'var(--hub-text-2)' }}>
                  {portfolioCoordinator.campaignObjective.slice(0, 60)}
                  {portfolioCoordinator.campaignObjective.length > 60 && '…'}
                </p>
              )}
            </div>
          </div>

          {/* Subagent strip */}
          <div className="flex flex-1 gap-2">
            {SITE_ORDER.map(siteId => {
              const detail = sites[siteId];
              const subagent = detail?.subagentStatus ?? null;
              const grader   = detail?.graderVerdict   ?? null;
              const statusKey  = subagent?.status ?? 'never_run';
              const verdictKey = grader?.verdict;
              const pillStyle  = SUBAGENT_PILL[statusKey] ?? SUBAGENT_PILL.never_run;

              return (
                <div
                  key={siteId}
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2"
                  style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}
                >
                  <span className="text-[10px] font-bold" style={{ color: 'var(--hub-text-2)' }}>
                    {SITE_SHORT[siteId] ?? siteId}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pillStyle.extra ?? ''}`}
                    style={{ background: pillStyle.bg, color: pillStyle.color }}
                  >
                    {statusKey.replace('_', ' ')}
                  </span>

                  {verdictKey && verdictKey !== 'never_run' ? (() => {
                    const gs = GRADER_PILL[verdictKey];
                    return gs ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: gs.bg, color: gs.color }}
                      >
                        {verdictKey}{(grader?.retryCount ?? 0) > 0 ? ` (×${grader!.retryCount})` : ''}
                      </span>
                    ) : null;
                  })() : (
                    <span className="text-[10px]" style={{ color: 'var(--hub-text-3)' }}>—</span>
                  )}

                  {grader?.rubricName && (
                    <span className="text-center text-[9px] leading-tight" style={{ color: 'var(--hub-text-3)' }}>
                      {grader.rubricName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Batch status */}
          <div className="w-1/4 min-w-0 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
              Batch Status
            </p>
            <div className="mt-2 flex gap-4">
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#34d399' }}>
                  {portfolioCoordinator?.batchStatus.approved ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--hub-text-3)' }}>Approved</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--hub-text-2)' }}>
                  {portfolioCoordinator?.batchStatus.pending ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--hub-text-3)' }}>Pending</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: '#f87171' }}>
                  {portfolioCoordinator?.batchStatus.failed ?? 0}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--hub-text-3)' }}>Failed</p>
              </div>
            </div>
            {portfolioCoordinator?.batchStatus.readyForReview && (
              <a
                href="#review-queue"
                className="mt-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                ⚑ Batch ready — review before publishing
              </a>
            )}
          </div>

        </div>

        {/* Dreaming — collapsible */}
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--hub-border)' }}>
          <button
            onClick={() => setDreamingOpen(o => !o)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:brightness-125"
            style={{ color: 'var(--hub-text-3)' }}
          >
            Dreaming {dreamingOpen ? '▲' : '▼'}
          </button>

          {dreamingOpen && (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
              {[
                ['Last run', dreaming?.lastRun ? relativeTime(dreaming.lastRun) : 'Never run'],
                ['Next run', dreaming?.nextRun ? relativeTime(dreaming.nextRun) : 'Sunday night'],
                ['Mode', dreaming?.mode ?? '—'],
                ['Memory updates', String(dreaming?.memoryUpdates ?? 0)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span style={{ color: 'var(--hub-text-3)' }}>{label} </span>
                  <span className="font-medium" style={{ color: 'var(--hub-text-1)' }}>{val}</span>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-1.5">
                <span style={{ color: 'var(--hub-text-3)' }}>Patterns </span>
                {(dreaming?.patternsExtracted?.length ?? 0) > 0 ? (
                  dreaming!.patternsExtracted.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{ background: 'var(--hub-accent-dim)', color: '#a5b4fc' }}
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--hub-text-3)' }}>None recorded</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
