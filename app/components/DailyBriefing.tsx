"use client";

import { useEffect, useState } from "react";
import type { StatusResponse } from "../api/status/route";
import type { ActionLogEntry, ActionsResponse } from "../api/actions/route";
import type { OldOakTownStatus } from "../api/oldoaktown/route";
import { SITE_SHORT } from "../lib/siteConstants";

interface FocusItem {
  id: string;
  dot: "red" | "amber" | "grey";
  text: string;
  tag: string;
}

const DOT_STYLE: Record<FocusItem["dot"], { bg: string; glow?: string }> = {
  red:   { bg: 'var(--bad)',  glow: '0 0 6px color-mix(in srgb, var(--bad) 60%, transparent)' },
  amber: { bg: 'var(--warn)', glow: '0 0 6px color-mix(in srgb, var(--warn) 60%, transparent)' },
  grey:  { bg: 'var(--idle)' },
};

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Open actions from the central `actions_log` table (via /api/actions?status=open),
// replacing the old localStorage `tasks-${siteId}` tracker. Blocked and
// revenue-related items surface as red; everything in progress is amber.
function buildActionItems(actions: ActionLogEntry[]): FocusItem[] {
  const revenue: FocusItem[] = [];
  const rest: FocusItem[] = [];

  for (const a of actions) {
    const isRevenue = /revenue|consult/i.test(`${a.action} ${a.channel ?? ""}`);
    const dot: FocusItem["dot"] =
      a.status === "blocked" || isRevenue ? "red" : "amber";
    const tag = a.siteId
      ? SITE_SHORT[a.siteId] ?? a.siteId
      : a.channel
      ? titleCase(a.channel)
      : "General";
    const item: FocusItem = {
      id: `action-${a.id}`,
      dot,
      text: a.action,
      tag,
    };
    if (dot === "red") revenue.push(item); else rest.push(item);
  }

  return [...revenue, ...rest];
}

function buildSystemItems(statusMap: StatusResponse): FocusItem[] {
  const items: FocusItem[] = [];
  const { sites, weekReview } = statusMap;

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

  if (weekReview?.week) {
    const decide = weekReview.flagged + weekReview.blocked;
    const plural = (n: number) => (n === 1 ? "" : "s");
    if (decide > 0) {
      items.push({
        id: "review-decide",
        dot: "red",
        text: `${decide} post${plural(decide)} need${decide === 1 ? "s" : ""} your decision`,
        tag: "Sunday review",
      });
    }
    if (weekReview.ready > 0) {
      items.push({
        id: "review-ready",
        dot: "amber",
        text: `${weekReview.ready} post${plural(weekReview.ready)} ready to approve`,
        tag: "Sunday review",
      });
    }
    if (weekReview.approved > 0) {
      items.push({
        id: "review-approved",
        dot: "amber",
        text: `${weekReview.approved} approved post${plural(weekReview.approved)} waiting for Cowork to schedule`,
        tag: "Schedule",
      });
    }
    if (weekReview.unchecked > 0) {
      items.push({
        id: "review-unchecked",
        dot: "grey",
        text: `${weekReview.unchecked} draft${plural(weekReview.unchecked)} not yet checked by the Brand gate`,
        tag: "Brand gate",
      });
    }
  }

  return items;
}

// Old Oak Town's own admin dashboard (separate site/repo) — approvals waiting
// there, plus newly-approved businesses not yet drafted for social/newsletter.
// See app/api/oldoaktown/route.ts and app/components/OldOakTownAdmin.tsx (the
// full panel with the "Promote" action lives on the main dashboard; this just
// surfaces it as a notification here).
function buildOldOakTownItems(data: OldOakTownStatus | null): FocusItem[] {
  if (!data) return [];
  const items: FocusItem[] = [];

  const pendingBusinesses = data.businesses.pending?.length ?? 0;
  if (pendingBusinesses > 0) {
    items.push({
      id: "oot-pending-businesses",
      dot: "red",
      text: `${pendingBusinesses} new business${pendingBusinesses === 1 ? "" : "es"} awaiting approval`,
      tag: "OOT · Admin",
    });
  }

  const pendingEvents = data.events.pending?.length ?? 0;
  if (pendingEvents > 0) {
    items.push({
      id: "oot-pending-events",
      dot: "red",
      text: `${pendingEvents} new event${pendingEvents === 1 ? "" : "s"} awaiting approval`,
      tag: "OOT · Admin",
    });
  }

  if (data.readyToPromote > 0) {
    items.push({
      id: "oot-ready-to-promote",
      dot: "amber",
      text: `${data.readyToPromote} approved business${data.readyToPromote === 1 ? "" : "es"} ready to spotlight`,
      tag: "OOT · Promote",
    });
  }

  return items;
}

export default function DailyBriefing({ statusMap }: { statusMap: StatusResponse }) {
  const [open,       setOpen]       = useState(true);
  const [taskItems,  setTaskItems]  = useState<FocusItem[]>([]);
  const [oldOakTown, setOldOakTown] = useState<OldOakTownStatus | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("hub-briefing-open");
    if (stored !== null) setOpen(stored === "true");

    fetch("/api/actions?status=open&limit=50")
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        if (data?.actions) setTaskItems(buildActionItems(data.actions));
      })
      .catch(() => {});

    fetch("/api/oldoaktown")
      .then(r => r.ok ? r.json() : null)
      .then((data: OldOakTownStatus | null) => setOldOakTown(data))
      .catch(() => {});
  }, []);

  const review = statusMap.weekReview;
  const systemItems = [...buildOldOakTownItems(oldOakTown), ...buildSystemItems(statusMap)];
  const allItems = [...taskItems, ...systemItems].slice(0, 7);
  const urgentCount = allItems.filter(i => i.dot === "red").length;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem("hub-briefing-open", String(next));
  }

  return (
    <div style={{ borderBottom: '1px solid var(--hub-border)' }}>
      <div className="px-4 py-3">

        {/* Toggle header */}
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
              Today&apos;s Focus
            </span>
            <span className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>{today}</span>
            {!open && urgentCount > 0 && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{ background: 'color-mix(in srgb, var(--bad) 15%, transparent)', color: 'var(--bad)', border: '1px solid color-mix(in srgb, var(--bad) 25%, transparent)' }}
              >
                {urgentCount} urgent
              </span>
            )}
          </div>
          <span className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>{open ? "▲" : "▼"}</span>
        </button>

        {/* ── This week's content, from the real review state ── */}
        <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
          {review && review.week ? (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--hub-text-3)' }}>
                <span className="font-medium" style={{ color: 'var(--hub-text-2)' }}>Week of {review.week}</span>
                {` · ${review.ready} ready · ${review.flagged + review.blocked} to decide · ${review.approved} approved · ${review.pushed} scheduled`}
              </p>
              <a
                href={`/review?week=${review.week}`}
                className="mt-1 inline-block text-[12px] font-medium transition-colors hover:brightness-125"
                style={{ color: 'var(--hub-accent-text)' }}
              >
                Open Sunday review →
              </a>
            </>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>
              No posts drafted yet. Cowork drafts on Saturday at 06:55.
            </p>
          )}
        </div>

        {/* ── Tasks (collapsible) ── */}
        {open && (
          <div className="mt-3 flex flex-col gap-0.5">
            {allItems.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--hub-text-3)' }}>
                No tasks outstanding — great work!
              </p>
            ) : (
              allItems.map(item => {
                const dot = DOT_STYLE[item.dot];
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors"
                    style={{ ['--hover-bg' as string]: 'var(--hub-surface-2)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--hub-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: dot.bg, boxShadow: dot.glow }}
                    />
                    <span className="min-w-0 flex-1 text-xs font-medium leading-snug" style={{ color: 'var(--hub-text-1)' }}>
                      {item.text}
                    </span>
                    <span
                      className="ml-2 flex-shrink-0 rounded px-1.5 py-0.5 text-[12px] font-medium"
                      style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)' }}
                    >
                      {item.tag}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
