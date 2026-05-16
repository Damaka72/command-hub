"use client";

import { useEffect, useState } from "react";
import type { SiteDetail, StatusResponse } from "../api/status/route"; // SiteDetail used in buildItems parameter
import { SITE_SHORT } from "../lib/siteConstants";

interface WorkItem {
  id: string;
  priority: 'high' | 'med' | 'low';
  category: string;
  title: string;
  detail?: string;
}

const STATIC_ITEMS: WorkItem[] = [
  { id: 's6', priority: 'high', category: 'Revenue', title: 'Move TCC workshops to MYCP Skool', detail: 'CHAOS + Concurrent Contractor workshops — see MYCP tasks' },
];

function buildItems(
  sites: Record<string, SiteDetail>,
  portfolioCoordinator: StatusResponse['portfolioCoordinator'],
  dreaming: StatusResponse['dreaming'],
): WorkItem[] {
  const items: WorkItem[] = [...STATIC_ITEMS];

  for (const [siteId, detail] of Object.entries(sites)) {
    const name = SITE_SHORT[siteId] ?? siteId;

    if (detail.outstanding.overdueFollowUps > 0) {
      const n = detail.outstanding.overdueFollowUps;
      items.push({
        id: `overdue-${siteId}`,
        priority: 'high',
        category: 'Outstanding',
        title: `${n} overdue follow-up${n > 1 ? 's' : ''} · ${name}`,
      });
    }

    if (detail.scheduledCount === 0) {
      items.push({
        id: `schedule-${siteId}`,
        priority: 'med',
        category: 'Social',
        title: `No posts scheduled · ${name}`,
        detail: 'Open Blotato to schedule content',
      });
    }
  }

  // Batch ready for review
  if (portfolioCoordinator?.batchStatus.readyForReview) {
    const n = portfolioCoordinator.batchStatus.approved;
    items.push({
      id: 'batch-ready',
      priority: 'high',
      category: 'Review',
      title: `${n} draft${n !== 1 ? 's' : ''} ready for review before publishing`,
      detail: 'Open the Review Queue in each site card',
    });
  }

  // Any failed grader verdicts
  for (const [siteId, detail] of Object.entries(sites)) {
    const name = SITE_SHORT[siteId] ?? siteId;
    if (detail.graderVerdict?.verdict === 'fail') {
      items.push({
        id: `grader-fail-${siteId}`,
        priority: 'high',
        category: 'Grader',
        title: `Grader failed · ${name}`,
        detail: detail.graderVerdict.failedCriterion ?? 'Check the Pipeline tab',
      });
    }
  }

  // Lead coordinator hasn't run (no theme set)
  if (!portfolioCoordinator?.weeklyTheme) {
    items.push({
      id: 'coordinator-no-theme',
      priority: 'med',
      category: 'Agents',
      title: 'No weekly theme set — lead coordinator has not run',
      detail: 'Set the theme in content-coordinator.json to trigger the pipeline',
    });
  }

  // Dreaming overdue (hasn't run this week)
  if (dreaming) {
    const lastRunDate = dreaming.lastRun ? new Date(dreaming.lastRun) : null;
    const daysSince = lastRunDate
      ? Math.floor((Date.now() - lastRunDate.getTime()) / 86400000)
      : Infinity;
    if (daysSince > 7) {
      items.push({
        id: 'dreaming-overdue',
        priority: 'low',
        category: 'Dreaming',
        title: 'Dreaming has not run this week',
        detail: `Last run: ${lastRunDate ? lastRunDate.toLocaleDateString('en-GB') : 'never'}`,
      });
    }
  }

  const order = { high: 0, med: 1, low: 2 } as const;
  return items.sort((a, b) => order[a.priority] - order[b.priority]);
}

const DOT: Record<WorkItem['priority'], string> = {
  high: 'bg-red-400',
  med:  'bg-amber-400',
  low:  'bg-zinc-400 dark:bg-zinc-500',
};

export default function DailyBriefing({ statusMap }: { statusMap: StatusResponse }) {
  const [open, setOpen] = useState(true);
  const { sites, portfolioCoordinator, dreaming } = statusMap;

  useEffect(() => {
    const stored = localStorage.getItem('hub-briefing-open');
    if (stored !== null) setOpen(stored === 'true');
  }, []);

  const items       = buildItems(sites, portfolioCoordinator, dreaming);
  const urgentCount = items.filter(i => i.priority === 'high').length;
  const today       = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem('hub-briefing-open', String(next));
  }

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Today&apos;s Focus
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{today}</span>
            {!open && urgentCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {urgentCount} urgent
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-0.5">
            {items.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Nothing outstanding — great work!</p>
            ) : items.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT[item.priority]}`} />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{item.title}</span>
                  {item.detail && (
                    <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">{item.detail}</span>
                  )}
                </div>
                <span className="ml-2 flex-shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
