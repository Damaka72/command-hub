"use client";

import { useEffect, useState } from "react";
import type { StatusResponse } from "../api/status/route";
import type { CoordinatorStatusData, SiteCoordinatorStatus } from "../api/coordinator-status/route";
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

const COORDINATOR_SITES: { key: keyof CoordinatorStatusData["sites"]; label: string; newsletter: string }[] = [
  { key: "aivvp", label: "AIVVP",  newsletter: "Prompt-ly" },
  { key: "mycp",  label: "MYCP",   newsletter: "The Pathway" },
  { key: "tcc",   label: "TCC",    newsletter: "The Consultant" },
  { key: "oot",   label: "OOT",    newsletter: "The Oak" },
];

const NEWSLETTER_STATUSES = [
  "not started",
  "in progress",
  "draft ready",
  "scheduled",
  "sent",
] as const;

function isAllClear(site: SiteCoordinatorStatus): boolean {
  return site.postsApproved > 0 && site.postsPending === 0 && site.newsletterStatus === "scheduled";
}

// Task-based items — reads localStorage client-side.
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

function buildSystemItems(statusMap: StatusResponse): FocusItem[] {
  const items: FocusItem[] = [];
  const { sites, portfolioCoordinator, dreaming } = statusMap;

  items.push({
    id: "s-workshops",
    dot: "red",
    text: "Move TCC workshops to MYCP Skool",
    tag: "Revenue",
  });

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

  if (portfolioCoordinator?.batchStatus.readyForReview) {
    const n = portfolioCoordinator.batchStatus.approved;
    items.push({
      id: "batch-ready",
      dot: "red",
      text: `${n} draft${n !== 1 ? "s" : ""} ready for review before publishing`,
      tag: "Review",
    });
  }

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

  if (!portfolioCoordinator?.weeklyTheme) {
    items.push({
      id: "coordinator-no-theme",
      dot: "amber",
      text: "No weekly theme set — lead coordinator has not run",
      tag: "Agents",
    });
  }

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
  const [open,       setOpen]       = useState(true);
  const [taskItems,  setTaskItems]  = useState<FocusItem[]>([]);
  const [coordData,  setCoordData]  = useState<CoordinatorStatusData | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [formSites,  setFormSites]  = useState<CoordinatorStatusData["sites"] | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("hub-briefing-open");
    if (stored !== null) setOpen(stored === "true");
    setTaskItems(buildTaskItems());

    fetch("/api/coordinator-status")
      .then(r => r.ok ? r.json() : null)
      .then((data: CoordinatorStatusData | null) => {
        if (!data) return;
        setCoordData(data);
        setFormSites(JSON.parse(JSON.stringify(data.sites)) as CoordinatorStatusData["sites"]);
      })
      .catch(() => {});
  }, []);

  const systemItems = buildSystemItems(statusMap);
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

  function updateFormSite(
    key: keyof CoordinatorStatusData["sites"],
    field: keyof SiteCoordinatorStatus,
    value: string | number,
  ) {
    setFormSites(prev =>
      prev ? { ...prev, [key]: { ...prev[key], [field]: value } } : prev
    );
  }

  async function handleSave() {
    if (!formSites || !coordData) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body: CoordinatorStatusData = {
        ...coordData,
        lastUpdated: new Date().toISOString(),
        sites: formSites,
      };
      const res = await fetch("/api/coordinator-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean };
      if (json.ok) {
        setCoordData(body);
        setSaveMsg("Saved");
      } else {
        setSaveMsg("Save failed");
      }
    } catch {
      setSaveMsg("Save failed");
    } finally {
      setSaving(false);
    }
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

        {/* ── Section 1 — Content status strip (always visible) ── */}
        <div className="mt-2 rounded-lg bg-zinc-100 px-2.5 py-2 dark:bg-zinc-800">
          {coordData ? (
            <div className="flex flex-col gap-0.5">
              {COORDINATOR_SITES.map(({ key, label, newsletter }) => {
                const s = coordData.sites[key];
                const allClear = isAllClear(s);
                return (
                  <p key={key} className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {allClear ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>{" "}
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
                        {" — All clear"}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
                        {` — ${s.postsPending} pending · ${newsletter}: ${s.newsletterStatus}`}
                      </>
                    )}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Loading content status…</p>
          )}

          {/* Update panel toggle */}
          <button
            onClick={() => setUpdateOpen(u => !u)}
            className="mt-2 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {updateOpen ? "▲ Hide update panel" : "▼ Update content status"}
          </button>

          {/* ── Update panel (collapsed by default) ── */}
          {updateOpen && formSites && (
            <div className="mt-2 flex flex-col gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              {COORDINATOR_SITES.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {label}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Approved
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formSites[key].postsApproved}
                        onChange={e => updateFormSite(key, "postsApproved", Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Pending
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formSites[key].postsPending}
                        onChange={e => updateFormSite(key, "postsPending", Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Newsletter status
                    </label>
                    <select
                      value={formSites[key].newsletterStatus}
                      onChange={e => updateFormSite(key, "newsletterStatus", e.target.value)}
                      className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {NEWSLETTER_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Last briefed
                      </label>
                      <input
                        type="text"
                        value={formSites[key].lastBriefed}
                        onChange={e => updateFormSite(key, "lastBriefed", e.target.value)}
                        placeholder="e.g. 2026-05-18"
                        className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Next send
                      </label>
                      <input
                        type="text"
                        value={formSites[key].nextSend}
                        onChange={e => updateFormSite(key, "nextSend", e.target.value)}
                        placeholder="e.g. friday"
                        className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      Week theme
                    </label>
                    <input
                      type="text"
                      value={formSites[key].weekTheme}
                      onChange={e => updateFormSite(key, "weekTheme", e.target.value)}
                      placeholder="This week's theme"
                      className="w-full rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {saving ? "Saving…" : "Save all"}
                </button>
                {saveMsg && (
                  <span className={`text-xs ${saveMsg === "Saved" ? "text-emerald-500" : "text-red-500"}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2 — Tasks (collapsible) ── */}
        {open && (
          <div className="mt-3 flex flex-col gap-0.5">
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
          </div>
        )}

      </div>
    </div>
  );
}
