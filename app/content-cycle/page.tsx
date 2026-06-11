"use client";

import { useEffect, useState } from "react";

// ── Cycle metadata ──────────────────────────────────────────────────────────
const CYCLE = {
  name: "Cycle 1 — 15 Jun to 12 Jul 2026",
  scheduleDay: "Sunday 14 June — load & schedule in Blotato",
  totalSlots: 312,
  breakdown: "292 posts · 12 newsletters · Pinterest 3×/wk (AIVVP) · YouTube Sat (AIVVP + MYCP)",
};

const DOCS_FOLDER =
  "C:\\Users\\didi_\\OneDrive\\Documents\\Claude\\Projects\\Command Hub — Marketing Plan";

type Doc = { group: string; name: string };

const docs: Doc[] = [
  { group: "Strategy", name: "Monthly Operating Model — v1 (Jun 2026).md" },
  { group: "Strategy", name: "Content Library Structure — Google Drive.md" },
  { group: "Strategy", name: "Sprint Plan + Proposed Themes — 10-14 Jun 2026.md" },
  { group: "Calendar", name: "Content Calendar — 15 Jun-12 Jul 2026.csv" },
  { group: "Core ideas", name: "Core Ideas — AIVVP — 15 Jun-12 Jul 2026.md" },
  { group: "Core ideas", name: "Core Ideas — MYCP — 15 Jun-12 Jul 2026.md" },
  { group: "Core ideas", name: "Core Ideas — OOT — 15 Jun-12 Jul 2026.md" },
  { group: "Core ideas", name: "Core Ideas — TCC — 15 Jun-12 Jul 2026.md" },
  { group: "Copy packs — W1", name: "Copy Pack — AIVVP — W1 (15-21 Jun).md" },
  { group: "Copy packs — W1", name: "Copy Pack — MYCP — W1 (15-21 Jun).md" },
  { group: "Copy packs — W1", name: "Copy Pack — OOT — W1 (15-21 Jun).md" },
  { group: "Copy packs — W1", name: "Copy Pack — TCC — W1 (15-21 Jun).md" },
  { group: "Copy packs — W2", name: "Copy Pack — AIVVP — W2 (22-28 Jun).md" },
  { group: "Copy packs — W2", name: "Copy Pack — MYCP — W2 (22-28 Jun).md" },
  { group: "Copy packs — W2", name: "Copy Pack — OOT — W2 (22-28 Jun).md" },
  { group: "Copy packs — W2", name: "Copy Pack — TCC — W2 (22-28 Jun).md" },
  { group: "Copy packs — W3", name: "Copy Pack — AIVVP — W3 (29 Jun-5 Jul).md" },
  { group: "Copy packs — W3", name: "Copy Pack — MYCP — W3 (29 Jun-5 Jul).md" },
  { group: "Copy packs — W3", name: "Copy Pack — OOT — W3 (29 Jun-5 Jul).md" },
  { group: "Copy packs — W3", name: "Copy Pack — TCC — W3 (29 Jun-5 Jul).md" },
  { group: "Copy packs — W4", name: "Copy Pack — AIVVP — W4 (6-12 Jul).md" },
  { group: "Copy packs — W4", name: "Copy Pack — MYCP — W4 (6-12 Jul).md" },
  { group: "Copy packs — W4", name: "Copy Pack — OOT — W4 (6-12 Jul).md" },
  { group: "Copy packs — W4", name: "Copy Pack — TCC — W4 (6-12 Jul).md" },
  { group: "Newsletters", name: "Newsletters — MYCP — 4 issues (Jun-Jul 2026).md" },
  { group: "Newsletters", name: "Newsletters — AIVVP — 4 issues (Jun-Jul 2026).md" },
  { group: "Newsletters", name: "Newsletters — OOT — 4 issues (Jun-Jul 2026).md" },
];

// ── Actions ─────────────────────────────────────────────────────────────────
type Owner = "Didi" | "Cowork";

type Action = {
  id: string;
  label: string;
  owner: Owner;
  due: string;
};

const actions: Action[] = [
  { id: "review-packs", label: "Review & approve 16 copy packs + 12 newsletter issues (style notes propagate everywhere)", owner: "Didi", due: "Thu 11 Jun" },
  { id: "pinterest-board", label: "Create AIVVP Pinterest board in Blotato (needed for board ID before pins can schedule)", owner: "Didi", due: "Thu 11 Jun" },
  { id: "confirm-promos", label: "Confirm any live promotions this cycle (none assumed in copy)", owner: "Didi", due: "Thu 11 Jun" },
  { id: "oot-research", label: "OOT research pass — fill all 🔍 slots from HS2/OPDC/event sources", owner: "Cowork", due: "Thu 11 Jun" },
  { id: "oot-directory", label: "OOT directory picks: 2× W1 spotlights, 1× W3 summer spotlight, 2–3× W3 food spots (+ photos, permission)", owner: "Didi", due: "Fri 12 Jun" },
  { id: "oot-photos", label: "OOT photos: canal, green spaces, station site (own shots beat stock)", owner: "Didi", due: "Fri 12 Jun" },
  { id: "visuals", label: "Visual production from briefs (video-producer / Canva / Blotato Visuals) — ~112 assets, W1 priority", owner: "Cowork", due: "Fri–Sat 12–13 Jun" },
  { id: "blotato-load", label: "Load approved posts into Blotato via API as scheduled posts", owner: "Cowork", due: "Sat 13 Jun" },
  { id: "beehiiv-load", label: "Load newsletter drafts into Beehiiv (MYCP Tue, OOT Thu, AIVVP Fri)", owner: "Didi", due: "Sun 14 Jun" },
  { id: "verify", label: "Verify all 312 slots scheduled vs calendar — final spot-check in Blotato", owner: "Cowork + Didi", due: "Sun 14 Jun" },
  { id: "oot-voices", label: "OOT Local Voices outreach: 2 residents, 1 business owner, 1 community group (interview kit in W4 pack). Fallback decision Wed 8 Jul", owner: "Didi", due: "by Wed 8 Jul" },
  { id: "drive-archive", label: "File cycle content into Google Drive library per structure doc", owner: "Cowork", due: "End of cycle" },
];

const STORAGE_KEY = "content-cycle-2026-06-done";

export default function ContentCyclePage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore corrupt state */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  }, [done, loaded]);

  const toggle = (id: string) =>
    setDone((d) => ({ ...d, [id]: !d[id] }));

  const copyPath = async (name: string) => {
    try {
      await navigator.clipboard.writeText(`${DOCS_FOLDER}\\${name}`);
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const openCount = actions.filter((a) => !done[a.id]).length;
  const groups = Array.from(new Set(docs.map((d) => d.group)));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Content Cycle
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {CYCLE.name} · {CYCLE.totalSlots} slots
              </p>
            </div>
            <a
              href="/"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* Cycle summary */}
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">This cycle</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{CYCLE.breakdown}</p>
          <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">{CYCLE.scheduleDay}</p>
        </section>

        {/* Actions */}
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Actions ({openCount} open)
            </h2>
            <button
              onClick={() => setDone({})}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Reset all
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {actions.map((a) => (
              <li
                key={a.id}
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  done[a.id]
                    ? "bg-zinc-50 opacity-60 dark:bg-zinc-800/50"
                    : "bg-zinc-50 dark:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(done[a.id])}
                  onChange={() => toggle(a.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      done[a.id]
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {a.label}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        a.owner === "Didi"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      }`}
                    >
                      {a.owner}
                    </span>
                    Due {a.due}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Documents */}
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cycle documents</h2>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            All files live in the OneDrive project folder — click any name to copy its full path,
            then paste into File Explorer or your editor.
          </p>
          <p className="mt-2 break-all rounded bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {DOCS_FOLDER}
          </p>
          {groups.map((g) => (
            <div key={g} className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {g}
              </h3>
              <ul className="mt-1.5 space-y-1">
                {docs
                  .filter((d) => d.group === g)
                  .map((d) => (
                    <li key={d.name}>
                      <button
                        onClick={() => copyPath(d.name)}
                        className="w-full rounded px-2 py-1 text-left text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {d.name}
                        {copied === d.name && (
                          <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            path copied ✓
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
