"use client";

import { useEffect, useState } from "react";
import type { StatusResponse } from "../api/status/route";
import type { CoordinatorStatusData, SiteCoordinatorStatus } from "../api/coordinator-status/route";
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
  red:   { bg: '#f87171', glow: '0 0 6px rgba(248,113,113,0.6)' },
  amber: { bg: '#fbbf24', glow: '0 0 6px rgba(251,191,36,0.6)' },
  grey:  { bg: '#475569' },
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
  const { sites, portfolioCoordinator } = statusMap;

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
  const [coordData,  setCoordData]  = useState<CoordinatorStatusData | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [formSites,  setFormSites]  = useState<CoordinatorStatusData["sites"] | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("hub-briefing-open");
    if (stored !== null) setOpen(stored === "true");

    fetch("/api/actions?status=open&limit=50")
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        if (data?.actions) setTaskItems(buildActionItems(data.actions));
      })
      .catch(() => {});

    fetch("/api/coordinator-status")
      .then(r => r.ok ? r.json() : null)
      .then((data: CoordinatorStatusData | null) => {
        if (!data) return;
        setCoordData(data);
        setFormSites(JSON.parse(JSON.stringify(data.sites)) as CoordinatorStatusData["sites"]);
      })
      .catch(() => {});

    fetch("/api/oldoaktown")
      .then(r => r.ok ? r.json() : null)
      .then((data: OldOakTownStatus | null) => setOldOakTown(data))
      .catch(() => {});
  }, []);

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

  const inputCls = "w-full rounded px-1.5 py-1 text-xs outline-none focus:ring-1";
  const inputStyle = {
    background: 'var(--hub-bg)',
    border: '1px solid var(--hub-border)',
    color: 'var(--hub-text-1)',
  };

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
                style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                {urgentCount} urgent
              </span>
            )}
          </div>
          <span className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>{open ? "▲" : "▼"}</span>
        </button>

        {/* ── Content status strip ── */}
        <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
          {coordData ? (
            <div className="flex flex-col gap-0.5">
              {COORDINATOR_SITES.map(({ key, label, newsletter }) => {
                const s = coordData.sites[key];
                const allClear = isAllClear(s);
                return (
                  <p key={key} className="text-[12px] leading-relaxed" style={{ color: 'var(--hub-text-3)' }}>
                    {allClear ? (
                      <>
                        <span style={{ color: '#34d399' }}>✓</span>{" "}
                        <span className="font-medium" style={{ color: 'var(--hub-text-2)' }}>{label}</span>
                        {" — All clear"}
                      </>
                    ) : (
                      <>
                        <span className="font-medium" style={{ color: 'var(--hub-text-2)' }}>{label}</span>
                        {` — ${s.postsPending} pending · ${newsletter}: ${s.newsletterStatus}`}
                      </>
                    )}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>Loading content status…</p>
          )}

          <button
            onClick={() => setUpdateOpen(u => !u)}
            className="mt-2 text-[12px] font-medium transition-colors hover:brightness-125"
            style={{ color: 'var(--hub-text-3)' }}
          >
            {updateOpen ? "▲ Hide update panel" : "▼ Update content status"}
          </button>

          {updateOpen && formSites && (
            <div className="mt-2 flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid var(--hub-border)' }}>
              {COORDINATOR_SITES.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)' }}>
                    {label}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { lbl: 'Approved', field: 'postsApproved' as const, val: formSites[key].postsApproved },
                      { lbl: 'Pending',  field: 'postsPending'  as const, val: formSites[key].postsPending  },
                    ].map(({ lbl, field, val }) => (
                      <div key={field} className="flex flex-col gap-0.5">
                        <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>{lbl}</label>
                        <input
                          type="number" min={0} value={val}
                          onChange={e => updateFormSite(key, field, Math.max(0, parseInt(e.target.value) || 0))}
                          className={inputCls} style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>Newsletter status</label>
                    <select
                      value={formSites[key].newsletterStatus}
                      onChange={e => updateFormSite(key, "newsletterStatus", e.target.value)}
                      className={inputCls} style={inputStyle}
                    >
                      {NEWSLETTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { lbl: 'Last briefed', field: 'lastBriefed' as const, ph: 'e.g. 2026-05-18', val: formSites[key].lastBriefed },
                      { lbl: 'Next send',    field: 'nextSend'    as const, ph: 'e.g. friday',     val: formSites[key].nextSend    },
                    ].map(({ lbl, field, ph, val }) => (
                      <div key={field} className="flex flex-col gap-0.5">
                        <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>{lbl}</label>
                        <input
                          type="text" value={val} placeholder={ph}
                          onChange={e => updateFormSite(key, field, e.target.value)}
                          className={inputCls} style={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--hub-text-3)' }}>Week theme</label>
                    <input
                      type="text" value={formSites[key].weekTheme}
                      onChange={e => updateFormSite(key, "weekTheme", e.target.value)}
                      placeholder="This week's theme"
                      className={inputCls} style={inputStyle}
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--hub-border)' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125 disabled:opacity-50"
                  style={{ background: 'var(--hub-accent)', color: 'var(--hub-accent-ink)' }}
                >
                  {saving ? "Saving…" : "Save all"}
                </button>
                {saveMsg && (
                  <span className="text-xs" style={{ color: saveMsg === "Saved" ? '#34d399' : '#f87171' }}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
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
