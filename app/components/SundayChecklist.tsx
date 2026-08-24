"use client";

// ── Sunday checklist ─────────────────────────────────────────────────────
// Lives inside /review (the real Sunday work surface) as a collapsible
// section, rather than as a second "what do I do on Sunday" page that
// replaced the whole Home view. YouTube rotation, the weekly checklist,
// coordinator quick links, and the Cowork media-post brief — everything
// SundayView used to show, minus the "Open Review queue" link that made
// sense standalone but not from inside /review itself.

import { useState, useEffect } from "react";

const COORDINATOR_LINKS = [
  { key: "aivvp", label: "AIVVP", url: "https://claude.ai/project/01996e3c-808c-7457-a43a-c0f830af4ab7" },
  { key: "mycp",  label: "MYCP",  url: "https://claude.ai/project/a740ba19-2ad2-4de9-b0a0-1a99512378dd" },
  { key: "tcc",   label: "TCC",   url: "https://claude.ai/project/0197e1d1-9a28-729f-8388-17974d7e829c" },
  { key: "oot",   label: "OOT",   url: "https://claude.ai/project/01994548-0edc-7432-b080-2deb9b296af3" },
] as const;

const CHECKLIST_ITEMS = [
  "Brief AIVVP Coordinator and read output",
  "Brief MYCP Coordinator and read output",
  "Brief TCC Coordinator and read output",
  "Brief OOT Coordinator and read output",
  "Add voice to all NEEDS YOUR VOICE sections",
  "Beehiiv — The Prompt-ly draft ready (Wednesday send)",
  "Beehiiv — The Pathway draft ready (Tuesday send)",
  "Beehiiv — The Oak draft ready (Thursday send)",
  "Review queue cleared — approved posts pushed to Blotato",
] as const;

// Direct link to the matching newsletter tab, shown next to each newsletter
// checklist item (keyed by its index in CHECKLIST_ITEMS above).
const NEWSLETTER_LINKS: Record<number, string> = {
  5: "the-prompt-ly",
  6: "the-pathway",
  7: "the-oak",
};

// The exact paste text used every Sunday to brief Cowork.
// To update, edit this constant directly.
const COWORK_BRIEF = `I need you to post this week's approved media posts (Instagram, TikTok, Pinterest, YouTube) to Blotato. Text posts (LinkedIn, Facebook, Twitter/X) are pushed from the dashboard Review queue — this brief covers media posts only.
API key: [YOUR BLOTATO API KEY]
Post each item using the Blotato API at https://backend.blotato.com/v2/posts with the header blotato-api-key and the exact accountId, pageId, platform, and content fields shown below.
Scheduling rules:
Instagram Reels: 09:00 GMT on the specified day
Instagram Stories: post immediately
TikTok posts: 18:00 GMT on the specified day
Pinterest posts: 14:00 GMT on the specified day — retrieve boardId first by calling blotato_list_pinterest_boards with accountId 6423
YouTube: 10:00 GMT on the specified day
After each post confirms successfully, tell me the post ID before moving to the next. If any post fails, stop and tell me the exact error message.
Work through the sites in this order: AIVVP first, then MYCP, then TCC, then OOT.
Here are this week's approved posts:

AIVVP POSTS: [paste the full Blotato fields block for each approved AIVVP post, exactly as the coordinator produced it]

MYCP POSTS: [paste the full Blotato fields block for each approved MYCP post]

TCC POSTS: [paste the full Blotato fields block for each approved TCC post]

OOT POSTS: [paste the full Blotato fields block for each approved OOT post]

That is all posts for this week. Once all are confirmed, open https://my.blotato.com and check the calendar to verify everything is showing correctly. Tell me what you see.`;

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
  const storageKey  = `sunday-checklist-${currentWeek}`;

  const [checked,   setChecked]   = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false));
  const [briefOpen, setBriefOpen] = useState(false);

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

  // YouTube rotation — even ISO week: AIVVP/TCC = Yes, MYCP = No
  const monday0 = getMondayOfCurrentWeek();
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const monday = new Date(monday0);
    monday.setDate(monday0.getDate() + i * 7);
    const weekNum = getISOWeek(monday);
    const aivvcTcc = weekNum % 2 === 0;
    return {
      weekNum,
      label: formatWeekRange(monday),
      aivvp: aivvcTcc ? "Yes" : "No",
      mycp:  aivvcTcc ? "No"  : "Yes",
      tcc:   aivvcTcc ? "Yes" : "No",
      isCurrent: i === 0,
    };
  });

  const completedCount = checked.filter(Boolean).length;
  const progressPct    = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="rounded-2xl border border-zinc-700 bg-gray-900 px-6 py-6">
      <div className="flex flex-col gap-8">

        {/* ── Section 1 — YouTube rotation ── */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-zinc-300">YouTube Rotation</h3>
          <div className="overflow-hidden rounded-xl border border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Week</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">AIVVP YouTube</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">MYCP YouTube</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">TCC YouTube</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr
                    key={w.weekNum}
                    className={`border-b border-zinc-800 last:border-0 ${w.isCurrent ? "bg-zinc-800" : "bg-zinc-900"}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-zinc-300">
                      {w.label}
                      {w.isCurrent && (
                        <span className="ml-2 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[12px] font-medium text-zinc-900">
                          this week
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-center text-xs font-semibold ${w.aivvp === "Yes" ? "text-emerald-400" : "text-zinc-500"}`}>{w.aivvp}</td>
                    <td className={`px-4 py-2.5 text-center text-xs font-semibold ${w.mycp === "Yes" ? "text-emerald-400" : "text-zinc-500"}`}>{w.mycp}</td>
                    <td className={`px-4 py-2.5 text-center text-xs font-semibold ${w.tcc === "Yes" ? "text-emerald-400" : "text-zinc-500"}`}>{w.tcc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 2 — Sunday checklist ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Sunday Checklist</h3>
            <span className="text-xs text-zinc-400">{completedCount} of {CHECKLIST_ITEMS.length} complete</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex flex-col gap-0.5">
            {CHECKLIST_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/60">
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked[i] ?? false}
                    onChange={() => toggleCheck(i)}
                    className="h-4 w-4 flex-shrink-0 rounded border-zinc-600 accent-emerald-500"
                  />
                  <span className={`text-sm ${checked[i] ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                    {item}
                  </span>
                </label>
                {NEWSLETTER_LINKS[i] && (
                  <a
                    href={`/newsletters?pub=${NEWSLETTER_LINKS[i]}`}
                    className="flex-shrink-0 rounded-lg border border-zinc-600 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-400 hover:bg-zinc-800"
                  >
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3 — Quick links ── */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-zinc-300">Open Coordinators</h3>
          <div className="flex flex-wrap gap-2">
            {COORDINATOR_LINKS.map(({ key, label, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-400 hover:bg-zinc-800"
              >
                Open {label} Coordinator →
              </a>
            ))}
          </div>
        </section>

        {/* ── Section 4 — Cowork brief ── */}
        <section>
          <button
            onClick={() => setBriefOpen(o => !o)}
            className={`flex w-full items-center justify-between border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 ${
              briefOpen ? "rounded-t-xl" : "rounded-xl"
            }`}
          >
            <span>Cowork brief — media posts only (Instagram / TikTok / Pinterest / YouTube)</span>
            <span className="text-xs text-zinc-500">{briefOpen ? "▲" : "▼"}</span>
          </button>
          {briefOpen && (
            <div className="rounded-b-xl border border-t-0 border-zinc-700 bg-zinc-900 px-5 py-4">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-400">
                {COWORK_BRIEF}
              </pre>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
