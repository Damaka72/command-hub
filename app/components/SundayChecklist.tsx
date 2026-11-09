"use client";

// ── Sunday checklist ─────────────────────────────────────────────────────
// Lives inside /review (the Sunday work surface) as a collapsible section.
// It matches the agreed flow: Cowork researches, drafts and checks on
// Saturday; Didi decides on the flagged posts, approves the rest in one
// action, and Cowork schedules what is approved. Nothing here asks Didi to
// brief a coordinator or paste anything into Cowork.

import { useState, useEffect } from "react";

const CHECKLIST_ITEMS = [
  "Decide the flagged and blocked posts",
  "Approve all ready posts",
  "Check the media list: film what needs filming, or ask Cowork to create the rest",
  "Tell Cowork: schedule this week",
  "Beehiiv: The Pathway draft ready (Tuesday send)",
  "Beehiiv: The Prompt-ly draft ready (Wednesday send)",
  "Beehiiv: The Oak draft ready (Thursday send)",
] as const;

// Direct link to the matching newsletter tab, shown next to each newsletter
// checklist item (keyed by its index in CHECKLIST_ITEMS above).
const NEWSLETTER_LINKS: Record<number, string> = {
  4: "the-pathway",
  5: "the-prompt-ly",
  6: "the-oak",
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMondayOfCurrentWeek(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const end   = sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${start} – ${end}`;
}

export default function SundayChecklist() {
  const today       = new Date();
  const currentWeek = getISOWeek(today);
  // v2: the items changed, so old saved ticks (by position) must not carry over.
  const storageKey  = `sunday-checklist-v2-${currentWeek}`;

  const [checked, setChecked] = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setChecked(JSON.parse(stored) as boolean[]);
      else setChecked(Array(CHECKLIST_ITEMS.length).fill(false));
    } catch {}
  }, [storageKey]);

  function toggleCheck(i: number) {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // YouTube rotation: even ISO week, AIVVP = Yes, MYCP = No
  const monday0 = getMondayOfCurrentWeek();
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const monday = new Date(monday0);
    monday.setDate(monday0.getDate() + i * 7);
    const weekNum = getISOWeek(monday);
    const aivvpWeek = weekNum % 2 === 0;
    return {
      weekNum,
      label: formatWeekRange(monday),
      aivvp: aivvpWeek ? "Yes" : "No",
      mycp:  aivvpWeek ? "No"  : "Yes",
      isCurrent: i === 0,
    };
  });

  const completedCount = checked.filter(Boolean).length;
  const progressPct    = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="rounded-2xl border border-line-2 bg-panel px-6 py-6">
      <div className="flex flex-col gap-8">

        {/* ── Section 1 — Sunday checklist ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Sunday Checklist</h3>
            <span className="text-xs text-fg-2">{completedCount} of {CHECKLIST_ITEMS.length} complete</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-3">
            <div className="h-full rounded-full bg-ok transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex flex-col gap-0.5">
            {CHECKLIST_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:brightness-125">
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked[i] ?? false}
                    onChange={() => toggleCheck(i)}
                    className="h-4 w-4 flex-shrink-0 rounded border-line-2 accent-accent"
                  />
                  <span className={`text-sm ${checked[i] ? "text-fg-3 line-through" : "text-fg"}`}>
                    {item}
                  </span>
                </label>
                {NEWSLETTER_LINKS[i] && (
                  <a
                    href={`/newsletters?pub=${NEWSLETTER_LINKS[i]}`}
                    className="flex-shrink-0 rounded-lg border border-line-2 bg-panel px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:border-line-2 hover:brightness-125"
                  >
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2 — YouTube rotation ── */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-fg">YouTube Rotation</h3>
          <div className="overflow-hidden rounded-xl border border-line-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-panel-2/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-2">Week</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-2">AIVVP YouTube</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-2">MYCP YouTube</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr
                    key={w.weekNum}
                    className={`border-b border-line last:border-0 ${w.isCurrent ? "bg-panel-2" : "bg-panel"}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-fg">
                      {w.label}
                      {w.isCurrent && (
                        <span className="ml-2 rounded-full bg-fg px-1.5 py-0.5 text-[12px] font-medium text-bg">
                          this week
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-center text-xs font-semibold ${w.aivvp === "Yes" ? "text-ok" : "text-fg-3"}`}>{w.aivvp}</td>
                    <td className={`px-4 py-2.5 text-center text-xs font-semibold ${w.mycp === "Yes" ? "text-ok" : "text-fg-3"}`}>{w.mycp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
