"use client";

import { useEffect, useState } from "react";
import type { StatusResponse } from "../api/status/route";
import { SITE_SHORT } from "../lib/siteConstants";

const SITE_IDS = [
  "oldoaktown",
  "theconcurrentcontractor",
  "masteryourcareerpath",
  "aiviralvideoprompts",
  "didianolue",
] as const;

interface Task {
  id: string;
  text: string;
  done: boolean;
}

interface FocusItem {
  id: string;
  dot: "red" | "amber" | "grey";
  text: string;
  tag: string;
}

const DOT: Record<FocusItem["dot"], string> = {
  red:   "bg-red-400",
  amber: "bg-amber-400",
  grey:  "bg-zinc-400 dark:bg-zinc-500",
};

// Task-based items — reads localStorage client-side.
// Revenue-tagged tasks → red; all others → amber (no timestamp data
// to distinguish "new" vs "old", so amber is used for all existing tasks).
function buildTaskItems(): FocusItem[] {
  const revenue: FocusItem[] = [];
  const rest: FocusItem[] = [];

  for (const siteId of SITE_IDS) {
    try {
      const stored = localStorage.getItem(`tasks-${siteId}`);
      if (!stored) continue;
      const tasks: Task[] = JSON.parse(stored);
      const tag = SITE_SHORT[siteId] ?? siteId;
      for (const t of tasks) {
        if (t.done) continue;
        const isRevenue = /revenue/i.test(t.text);
        const item: FocusItem = {
          id: `task-${siteId}-${t.id}`,
          dot: isRevenue ? "red" : "amber",
          text: t.text,
          tag,
        };
        if (isRevenue) revenue.push(item); else rest.push(item);
      }
    } catch {}
  }

  return [...revenue, ...rest];
}

// System-generated items from statusMap (overdue follow-ups, grader
// fails, etc.) — excludes the old "No posts scheduled" entries which
// are replaced by the Blotato status strip below.
function buildSystemItems(statusMap: StatusResponse): FocusItem[] {
  const items: FocusItem[] = [];
  const { sites, portfolioCoordinator, dreaming } = statusMap;

  // Static priority item
  items.push({
    id: "s-workshops",
    dot: "red",
    text: "Move TCC workshops to MYCP Skool",
    tag: "Revenue",
  });

  // Overdue follow-ups per site
  for (const [siteId, detail] of Object.entries(sites)) {
    if (detail.outstanding.overdueFollowUps > 0) {
      const n = detail.outstanding.overdueFollowUps;
      items.push({
        id: `overdue-${siteId}`,
        dot: "red",
        text: `${n} overdue follow-up${n > 1 ? "s" : ""} · ${SITE_SHORT[siteId] ?? siteId}`,
        tag: "Outstanding",
      });
    }
  }

  // Batch ready for review
  if (portfolioCoordinator?.batchStatus.readyForReview) {
    const n = portfolioCoordinator.batchStatus.approved;
    items.push({
      id: "batch-ready",
      dot: "red",
      text: `${n} draft${n !== 1 ? "s" : ""} ready for review before publishing`,
      tag: "Review",
    });
  }

  // Grader failures
  for (const [siteId, detail] of Object.entries(sites)) {
    if (detail.graderVerdict?.verdict === "fail") {
      items.push({
        id: `grader-fail-${siteId}`,
        dot: "red",
        text: `Grader failed · ${SITE_SHORT[siteId] ?? siteId}`,
        tag: "Grader",
      });
    }
  }

  // No weekly theme
  if (!portfolioCoordinator?.weeklyTheme) {
    items.push({
      id: "coordinator-no-theme",
      dot: "amber",
      text: "No weekly theme set — lead coordinator has not run",
      tag: "Agents",
    });
  }

  // Dreaming overdue
  if (dreaming) {
    const lastRunDate = dreaming.lastRun ? new Date(dreaming.lastRun) : null;
    const daysSince = lastRunDate
      ? Math.floor((Date.now() - lastRunDate.getTime()) / 86_400_000)
      : Infinity;
    if (daysSince > 7) {
      items.push({
        id: "dreaming-overdue",
        dot: "grey",
        text: "Dreaming has not run this week",
        tag: "Dreaming",
      });
    }
  }

  return items;
}

export default function DailyBriefing({ statusMap }: { statusMap: StatusResponse }) {
  const [open,      setOpen]      = useState(true);
  const [taskItems, setTaskItems] = useState<FocusItem[]>([]);

  const { sites } = statusMap;

  useEffect(() => {
    const stored = localStorage.getItem("hub-briefing-open");
    if (stored !== null) setOpen(stored === "true");
    setTaskItems(buildTaskItems());
  }, []);

  const systemItems = buildSystemItems(statusMap);

  // Task items take priority; system items fill remaining slots up to cap of 7.
  const allItems = [...taskItems, ...systemItems].slice(0, 7);
  const urgentCount = allItems.filter(i => i.dot === "red").length;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Compact Blotato status strip — one entry per site
  const blotatoStrip = SITE_IDS
    .map(id => `${SITE_SHORT[id]} — ${sites[id]?.scheduledCount ?? 0} scheduled`)
    .join(" · ");

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem("hub-briefing-open", String(next));
  }

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="px-4 py-3">

        {/* Toggle header */}
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
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="mt-3 flex flex-col gap-0.5">

            {/* Focus list — up to 7 items */}
            {allItems.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                No tasks outstanding — great work!
              </p>
            ) : (
              allItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT[item.dot]}`} />
                  <span className="min-w-0 flex-1 text-xs font-medium leading-snug text-zinc-700 dark:text-zinc-300">
                    {item.text}
                  </span>
                  <span className="ml-2 flex-shrink-0 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                    {item.tag}
                  </span>
                </div>
              ))
            )}

            {/* Blotato status strip */}
            <div className="mt-2 rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800">
              <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {blotatoStrip}
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
