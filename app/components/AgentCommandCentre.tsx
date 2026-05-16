"use client";

import { useState } from "react";
import type { PortfolioCoordinator, DreamingStatus, SiteDetail } from "../api/status/route";
import { SITE_SHORT } from "../lib/siteConstants";

const SITE_ORDER = [
  'didianolue',
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

interface Props {
  portfolioCoordinator: PortfolioCoordinator | null;
  dreaming: DreamingStatus | null;
  sites: Record<string, SiteDetail>;
}

export default function AgentCommandCentre({ portfolioCoordinator, dreaming, sites }: Props) {
  const [dreamingOpen, setDreamingOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-4">

        {/* Top row: Lead Coordinator | Subagent Strip | Batch Status */}
        <div className="flex gap-6">

          {/* Lead Coordinator — ~25% */}
          <div className="w-1/4 min-w-0 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Lead Coordinator
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">
              content-coordinator.json
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Last run</span>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {relativeTime(portfolioCoordinator?.lastRun ?? null)}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Theme </span>
                <span className={`text-xs font-medium ${portfolioCoordinator?.weeklyTheme ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {portfolioCoordinator?.weeklyTheme ?? 'Not set'}
                </span>
              </div>
              {portfolioCoordinator?.campaignObjective && (
                <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                  {portfolioCoordinator.campaignObjective.slice(0, 60)}
                  {portfolioCoordinator.campaignObjective.length > 60 && '…'}
                </p>
              )}
            </div>
          </div>

          {/* Subagent strip — ~50% */}
          <div className="flex flex-1 gap-2">
            {SITE_ORDER.map(siteId => {
              const detail = sites[siteId];
              const subagent = detail?.subagentStatus ?? null;
              const grader   = detail?.graderVerdict   ?? null;
              const statusKey  = subagent?.status ?? 'never_run';
              const verdictKey = grader?.verdict;

              return (
                <div
                  key={siteId}
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-zinc-50 px-2 py-2 dark:bg-zinc-800/50"
                >
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                    {SITE_SHORT[siteId] ?? siteId}
                  </span>

                  {/* Subagent status pill */}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SUBAGENT_PILL[statusKey] ?? SUBAGENT_PILL.never_run}`}>
                    {statusKey.replace('_', ' ')}
                  </span>

                  {/* Grader verdict pill */}
                  {verdictKey && verdictKey !== 'never_run' ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GRADER_PILL[verdictKey] ?? ''}`}>
                      {verdictKey}{(grader?.retryCount ?? 0) > 0 ? ` (×${grader!.retryCount})` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">—</span>
                  )}

                  {/* Rubric name */}
                  {grader?.rubricName && (
                    <span className="text-center text-[9px] leading-tight text-zinc-400 dark:text-zinc-500">
                      {grader.rubricName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Batch status — ~25% */}
          <div className="w-1/4 min-w-0 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Batch Status
            </p>
            <div className="mt-2 flex gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {portfolioCoordinator?.batchStatus.approved ?? 0}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
                  {portfolioCoordinator?.batchStatus.pending ?? 0}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {portfolioCoordinator?.batchStatus.failed ?? 0}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Failed</p>
              </div>
            </div>
            {portfolioCoordinator?.batchStatus.readyForReview && (
              <a
                href="#review-queue"
                className="mt-2 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              >
                ⚑ Batch ready — review before publishing
              </a>
            )}
          </div>

        </div>

        {/* Dreaming status — collapsible */}
        <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <button
            onClick={() => setDreamingOpen(o => !o)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
          >
            Dreaming {dreamingOpen ? '▲' : '▼'}
          </button>

          {dreamingOpen && (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Last run </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {dreaming?.lastRun ? relativeTime(dreaming.lastRun) : 'Never run'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Next run </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {dreaming?.nextRun ? relativeTime(dreaming.nextRun) : 'Sunday night'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Mode </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {dreaming?.mode ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Memory updates </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {dreaming?.memoryUpdates ?? 0}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-400 dark:text-zinc-500">Patterns </span>
                {(dreaming?.patternsExtracted?.length ?? 0) > 0 ? (
                  dreaming!.patternsExtracted.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">None recorded</span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
