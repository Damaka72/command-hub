"use client";

import { useEffect, useState } from "react";
import type { SiteDetail } from "../api/status/route";

interface WorkItem {
  id: string;
  priority: 'high' | 'med' | 'low';
  category: string;
  title: string;
  detail?: string;
}

const STATIC_ITEMS: WorkItem[] = [
  { id: 's1', priority: 'high', category: 'Revenue',  title: 'Wire Stripe payment to TCC trial button',       detail: '£97/mo blocked — app/command-center/page.tsx' },
  { id: 's2', priority: 'med',  category: 'Revenue',  title: 'Add GUMROAD_API_KEY to Vercel env vars',        detail: 'AIVVP revenue shows — instead of live figure' },
  { id: 's3', priority: 'med',  category: 'Setup',    title: 'Add GITHUB_TOKEN to Vercel env vars',           detail: 'Required for cross-device task persistence' },
  { id: 's4', priority: 'low',  category: 'Dev',      title: 'Add CLAUDE.md to Didi, TCC, AIVVP repos',      detail: '3 of 5 repos missing CLAUDE.md' },
  { id: 's5', priority: 'low',  category: 'Agents',   title: 'Plan first curator + health agent run',         detail: 'Non-retired agents across all sites' },
];

const SITE_SHORT: Record<string, string> = {
  oldoaktown:              'OOT',
  theconcurrentcontractor: 'TCC',
  masteryourcareerpath:    'MYCP',
  aiviralvideoprompts:     'AIVVP',
  didianolue:              'Didi',
};

const PRIORITY_AGENTS = ['curator', 'health', 'seo'];

function buildItems(statusMap: Record<string, SiteDetail>): WorkItem[] {
  const items: WorkItem[] = [...STATIC_ITEMS];

  for (const [siteId, detail] of Object.entries(statusMap)) {
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

    for (const agentName of PRIORITY_AGENTS) {
      const agent = detail.agentSummaries.find(a => a.name === agentName);
      if (agent && agent.status === 'never_run') {
        items.push({
          id: `agent-${agentName}-${siteId}`,
          priority: 'low',
          category: 'Agents',
          title: `Run ${agent.displayName} agent · ${name}`,
        });
      }
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

export default function DailyBriefing({ statusMap }: { statusMap: Record<string, SiteDetail> }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('hub-briefing-open');
    if (stored !== null) setOpen(stored === 'true');
  }, []);

  const items       = buildItems(statusMap);
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
