"use client";

import { useState } from "react";
import Link from "next/link";

// ── System Map Component ──────────────────────────────────────────────────────

function FlowRow({
  actor,
  actorType,
  children,
  isFirst = false,
  isLast = false,
}: {
  actor: string;
  actorType: "didi" | "auto" | "dreaming";
  children: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const actorColour = {
    didi:     "text-indigo-600 dark:text-indigo-400",
    auto:     "text-emerald-700 dark:text-emerald-400",
    dreaming: "text-fuchsia-700 dark:text-fuchsia-400",
  }[actorType];

  const dotColour = {
    didi:     "bg-indigo-500",
    auto:     "bg-emerald-500",
    dreaming: "bg-fuchsia-500",
  }[actorType];

  const lineColour = {
    didi:     "bg-indigo-200 dark:bg-indigo-800",
    auto:     "bg-emerald-200 dark:bg-emerald-800",
    dreaming: "bg-fuchsia-200 dark:bg-fuchsia-800",
  }[actorType];

  return (
    <div className="flex gap-0">
      {/* Actor label */}
      <div className="w-28 flex-shrink-0 flex items-center justify-end pr-4">
        <span className={`text-[10px] font-bold tracking-widest uppercase text-right ${actorColour}`}>
          {actor}
        </span>
      </div>

      {/* Connector */}
      <div className="w-5 flex-shrink-0 flex flex-col items-center">
        {!isFirst && <div className={`w-0.5 flex-1 min-h-2 ${lineColour}`} />}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColour}`} />
        {!isLast && <div className={`w-0.5 flex-1 min-h-2 ${lineColour}`} />}
      </div>

      {/* Content */}
      <div className="flex-1 py-3 pl-4 flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SystemMap() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-6">
        System Map — How Everything Connects
      </h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-8 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Didi does this</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Runs automatically</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fuchsia-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Weekly (Sunday night)</span>
        </span>
      </div>

      {/* Step label */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2 pl-32">
        Step 1 — Monday morning
      </p>

      <FlowRow actor="Didi" actorType="didi" isFirst>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Set the weekly theme</p>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
            Edit <code className="rounded bg-indigo-100 px-1 py-0.5 dark:bg-indigo-900/60">content-coordinator.json</code> — one line, one theme for all five sites
          </p>
          <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-1 italic">
            e.g. "IR35 myths busted" · "Old Oak planning update" · "PRIME framework in practice"
          </p>
        </div>
      </FlowRow>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2 pl-32 mt-4">
        Step 2 — Automated
      </p>

      <FlowRow actor="Lead Agent" actorType="auto">
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex-1 min-w-48 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Lead Coordinator</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Reads your theme · generates 5 site-specific briefs</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-1">Dashboard shows</p>
            <p className="text-amber-800 dark:text-amber-400">Last run · Weekly theme · Batch status</p>
          </div>
        </div>
      </FlowRow>

      <FlowRow actor="5 Subagents" actorType="auto">
        <div className="grid grid-cols-5 gap-2">
          {[
            { name: "Didi",  rubric: "Authority rubric" },
            { name: "MYCP",  rubric: "PRIME/OPERATE rubric" },
            { name: "TCC",   rubric: "Contractor lens" },
            { name: "OOT",   rubric: "No-fabrication" },
            { name: "AIVVP", rubric: "Conversion rubric" },
          ].map(s => (
            <div key={s.name} className="rounded-lg border border-zinc-200 bg-white px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">{s.name}</p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">Drafts content using {s.rubric} brief</p>
            </div>
          ))}
        </div>
      </FlowRow>

      <FlowRow actor="5 Graders" actorType="auto">
        <div className="flex flex-wrap gap-3">
          <div className="grid grid-cols-5 gap-2 flex-1">
            {["Didi", "MYCP", "TCC", "OOT", "AIVVP"].map(name => (
              <div key={name} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">✓ pass</p>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">or ↺ retry / ✗ fail</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-1">Dashboard shows</p>
            <p className="text-amber-800 dark:text-amber-400">Verdict · Retry count · Failed criterion · Full rubric in Pipeline tab</p>
          </div>
        </div>
      </FlowRow>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2 pl-32 mt-4">
        Step 3 — Didi reviews
      </p>

      <FlowRow actor="Didi" actorType="didi">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Webhook fires — you are notified</p>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
            Open the dashboard · check the Review Queue inside each site card · read each approved draft
          </p>
          <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-1 italic">
            Dashboard banner: "X drafts ready for review before publishing"
          </p>
        </div>
      </FlowRow>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2 pl-32 mt-4">
        Step 4 — Publishing
      </p>

      <FlowRow actor="Didi" actorType="didi">
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-900 dark:bg-purple-950/40">
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-300">Blotato — schedule and publish</p>
          <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
            Approved drafts are entered into Blotato manually · posts go live across all platforms
          </p>
          <p className="text-xs text-purple-500 dark:text-purple-500 mt-1 italic">
            Dashboard shows scheduled post count per site in real time via the Blotato API
          </p>
        </div>
      </FlowRow>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-2 pl-32 mt-4">
        Every Sunday night
      </p>

      <FlowRow actor="Dreaming" actorType="dreaming" isLast>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 flex-1 min-w-48 dark:border-fuchsia-900 dark:bg-fuchsia-950/40">
            <p className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-300">Reviews all five agent sessions</p>
            <p className="text-xs text-fuchsia-700 dark:text-fuchsia-400 mt-0.5">
              Extracts what worked · updates each agent's memory · improvements feed back to lead coordinator for Monday
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-1">Dashboard shows</p>
            <p className="text-amber-800 dark:text-amber-400">Last run · Memory updates · Patterns extracted</p>
          </div>
        </div>
      </FlowRow>
    </div>
  );
}

// ── Rubric data ───────────────────────────────────────────────────────────────

const RUBRICS = [
  {
    site: "Didi Anolue",
    url: "didianolue.co.uk",
    rubric: "Authority rubric",
    colour: "blue",
    pass: [
      "Communicates full-lifecycle procurement authority",
      "Speaks to senior commercial or public-sector audiences",
      "Contains a clear next step (contact, consult, connect)",
    ],
    fail: "Fails if generic — no specific domain expertise visible",
  },
  {
    site: "Master Your Career Path",
    url: "masteryourcareerpath.com",
    rubric: "PRIME/OPERATE rubric",
    colour: "orange",
    pass: [
      "Reinforces or references PRIME or OPERATE frameworks",
      "Speaks to professionals seeking career transformation",
      "Includes a path to Skool community, course, or cohort",
    ],
    fail: "Fails if frameworks are absent or unnamed",
  },
  {
    site: "The Concurrent Contractor",
    url: "theconcurrentcontractor.com",
    rubric: "Contractor lens rubric",
    colour: "yellow",
    pass: [
      "Written through the lens of a practising UK IT contractor",
      "Addresses IR35, rate strategy, or market intel",
      "Practical and peer-to-peer in tone — not advisory",
    ],
    fail: "Fails if it reads as generic career or recruitment content",
  },
  {
    site: "Old Oak Town",
    url: "oldoaktown.co.uk",
    rubric: "No-fabrication rubric",
    colour: "green",
    pass: [
      "Every factual claim is verifiable — no invented businesses or events",
      "Rooted in Old Oak Common or Park Royal regeneration area",
      "Hyperlocal voice — community-first, not corporate",
    ],
    fail: "Fails on any fabricated local detail — zero tolerance",
  },
  {
    site: "AI Viral Video Prompts",
    url: "aiviralvideoprompts.com",
    rubric: "Conversion rubric",
    colour: "teal",
    pass: [
      "Contains a clear conversion action (link, CTA, offer)",
      "Hook lands in the first line — no warm-up sentences",
      "Addresses a specific creator pain point, not generic AI hype",
      "Platform-appropriate length and format",
    ],
    fail: "Fails if no specific prompt example is included",
  },
];

const RUBRIC_COLOURS: Record<string, { border: string; bg: string; title: string }> = {
  blue:   { border: "border-blue-200 dark:border-blue-900",   bg: "bg-blue-50 dark:bg-blue-950/40",   title: "text-blue-900 dark:text-blue-300" },
  orange: { border: "border-orange-200 dark:border-orange-900", bg: "bg-orange-50 dark:bg-orange-950/40", title: "text-orange-900 dark:text-orange-300" },
  yellow: { border: "border-yellow-200 dark:border-yellow-900", bg: "bg-yellow-50 dark:bg-yellow-950/40", title: "text-yellow-900 dark:text-yellow-300" },
  green:  { border: "border-green-200 dark:border-green-900",  bg: "bg-green-50 dark:bg-green-950/40",  title: "text-green-900 dark:text-green-300" },
  teal:   { border: "border-teal-200 dark:border-teal-900",   bg: "bg-teal-50 dark:bg-teal-950/40",   title: "text-teal-900 dark:text-teal-300" },
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{children}</p>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [openRubric, setOpenRubric] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Operations Guide
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                How the Command Hub works · what feeds it · what you do each week
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 flex flex-col gap-12">

        {/* 1. What is the Command Hub */}
        <Section title="What is the Command Hub?">
          <Prose>
            The Command Hub is your central monitoring dashboard for all five sites in your digital
            portfolio. It gives you a single place to see whether your sites are live, how your
            content pipeline is running, what your agents have produced, and how many posts are
            scheduled to go out this week. Think of it as the control room — it does not do the
            work itself, but it shows you the state of everything that is working on your behalf.
          </Prose>
          <Prose>
            The dashboard is read-only. It pulls data from your sites, from the Blotato publishing
            platform, and from your agent system. You interact with it by reading status, reviewing
            content in the Review Queue, and then taking action in Blotato or in your agent
            configuration files.
          </Prose>
        </Section>

        {/* 2. System map */}
        <Section title="System Map — The Full Picture">
          <Prose>
            The diagram below shows the complete flow from your Monday input to published posts,
            including what the agents do automatically and where your decisions are required.
          </Prose>
          <SystemMap />
        </Section>

        {/* 3. Your five sites */}
        <Section title="Your Five Sites at a Glance">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Site</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Revenue model</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Grader rubric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {[
                  { site: "didianolue.co.uk",              purpose: "Personal consulting brand",          revenue: "Consulting enquiries",   rubric: "Authority rubric" },
                  { site: "masteryourcareerpath.com",       purpose: "Career platform & Skool community", revenue: "Subscriptions, cohorts", rubric: "PRIME/OPERATE rubric" },
                  { site: "theconcurrentcontractor.com",    purpose: "UK IT contractor resource",         revenue: "Lead generation",        rubric: "Contractor lens rubric" },
                  { site: "oldoaktown.co.uk",               purpose: "Hyperlocal media (build-to-sell)",  revenue: "Media / future sale",    rubric: "No-fabrication rubric" },
                  { site: "aiviralvideoprompts.com",        purpose: "AI prompt packs via Gumroad",       revenue: "Digital product sales",  rubric: "Conversion rubric" },
                ].map(row => (
                  <tr key={row.site}>
                    <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300">{row.site}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.purpose}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.revenue}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.rubric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 4. Weekly rhythm */}
        <Section title="The Weekly Rhythm">
          <Prose>
            The system runs on a Monday-to-Sunday cycle. Most of it is automatic — your only
            required inputs are setting the weekly theme on Monday and reviewing drafts when the
            webhook notifies you.
          </Prose>
          <div className="flex flex-col gap-3">
            {[
              {
                day: "Monday",
                who: "You",
                colour: "indigo",
                action: "Set the weekly theme",
                detail: "Edit content-coordinator.json with one line — the theme that will drive all five sites this week. The lead coordinator reads this and generates site-specific briefs.",
              },
              {
                day: "Monday–Tuesday",
                who: "Automatic",
                colour: "emerald",
                action: "Agents run",
                detail: "The lead coordinator fans out to all five subagents. Each subagent drafts content for its site. Each grader checks the draft against its rubric. Fails are retried automatically.",
              },
              {
                day: "When notified",
                who: "You",
                colour: "indigo",
                action: "Review and approve",
                detail: "You receive a webhook notification when the batch is ready. Open the dashboard, check the Today's Focus banner, then open each site card and review the drafts in the Review Queue tab.",
              },
              {
                day: "After review",
                who: "You",
                colour: "indigo",
                action: "Enter into Blotato",
                detail: "Copy approved drafts into Blotato and schedule them. The dashboard will update the scheduled post count per site once Blotato confirms.",
              },
              {
                day: "Friday",
                who: "You",
                colour: "indigo",
                action: "Note performance",
                detail: "Review what performed well and feed notes back. This can be informal — just note what resonated so next week's theme reflects it.",
              },
              {
                day: "Sunday night",
                who: "Automatic",
                colour: "fuchsia",
                action: "Dreaming runs",
                detail: "The dreaming process reviews all five agent sessions from the week, extracts patterns from what worked and what did not, and updates each agent's memory so the next cycle is sharper.",
              },
            ].map(row => {
              const bg   = row.colour === "indigo" ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900"
                         : row.colour === "fuchsia" ? "bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-900"
                         : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";
              const dayC = row.colour === "indigo" ? "text-indigo-700 dark:text-indigo-400"
                         : row.colour === "fuchsia" ? "text-fuchsia-700 dark:text-fuchsia-400"
                         : "text-emerald-700 dark:text-emerald-400";
              const whoC = row.colour === "indigo" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                         : row.colour === "fuchsia" ? "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/60 dark:text-fuchsia-300"
                         : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300";
              return (
                <div key={row.day} className={`rounded-xl border px-4 py-4 ${bg}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-bold ${dayC}`}>{row.day}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${whoC}`}>{row.who}</span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{row.action}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{row.detail}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 5. Your role vs agents */}
        <Section title="Your Role vs. What Runs Automatically">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-3">You do this</p>
              <ul className="flex flex-col gap-2">
                {[
                  "Set the weekly theme (content-coordinator.json)",
                  "Review drafts in the Review Queue when notified",
                  "Enter approved content into Blotato",
                  "Note Friday performance observations",
                  "Decide if a failed draft needs a manual fix",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-indigo-800 dark:text-indigo-300">
                    <span className="mt-0.5 flex-shrink-0 text-indigo-400">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">Runs automatically</p>
              <ul className="flex flex-col gap-2">
                {[
                  "Lead coordinator generates five site briefs",
                  "Each subagent drafts content for its site",
                  "Each grader scores the draft against its rubric",
                  "Failed drafts are retried automatically",
                  "Webhook fires when the batch is ready for review",
                  "Dreaming reviews sessions and updates agent memory (Sunday)",
                  "Dashboard pulls Blotato and Vercel status live",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="mt-0.5 flex-shrink-0 text-emerald-400">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 6. How to read the dashboard */}
        <Section title="How to Read the Dashboard">
          <div className="flex flex-col gap-4">
            {[
              {
                label: "Today's Focus banner",
                detail: "The collapsible panel at the top of the dashboard. High-priority items (red dot) need your attention today. Medium (amber) should be addressed this week. Low (grey) are background tasks. The most important signal here is 'Batch ready for review' — that means agents have finished and drafts are waiting for you.",
              },
              {
                label: "Portfolio bar",
                detail: "The thin strip below the header showing total revenue, active agent count, outstanding items, scheduled posts, and batch approval status across all five sites at a glance.",
              },
              {
                label: "Agent Command Centre",
                detail: "The panel between the portfolio bar and the site cards. Shows the lead coordinator's last run and weekly theme on the left, then a five-column strip showing each site's subagent status and grader verdict. Batch status on the right. If the amber 'Batch ready' banner appears here, that is your cue to review.",
              },
              {
                label: "Site cards",
                detail: "One card per site. The coloured top strip and avatar identify the brand. The info row shows Revenue, Agents, Last Activity, and Readiness score. Click 'More ↓' to expand the card and access the tabs.",
              },
              {
                label: "Pipeline tab (inside each site card)",
                detail: "Shows the subagent status for this site, the grader's verdict, retry count, and the specific criterion that caused a fail if applicable. Also shows the full rubric so you can see exactly what the grader is checking against.",
              },
              {
                label: "Outstanding tab → Review Queue",
                detail: "The drafts awaiting your review for this site. Shows platform, grader verdict, retry count, any failed criterion, and a content preview. This is where you read the draft before entering it into Blotato.",
              },
              {
                label: "Posts tab",
                detail: "Live scheduled posts from Blotato for this site. Updates on every dashboard load.",
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{item.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. What feeds the dashboard */}
        <Section title="What Feeds the Dashboard">
          <Prose>
            The dashboard does not store any data itself. It pulls everything fresh on each page
            load from four sources:
          </Prose>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                source: "JSON files on your sites",
                detail: "Each site hosts a set of JSON files in its public data directory. Your agents write to these files when they run. The dashboard reads them to show subagent status, grader verdicts, review queue items, coordinator data, and dreaming status.",
                files: ["content-coordinator.json", "subagent-status.json", "grader-verdict.json", "review-queue.json", "dreaming-status.json"],
              },
              {
                source: "Blotato API",
                detail: "The dashboard calls the Blotato API directly to count how many posts are scheduled per site. This is the live number shown in the portfolio bar and the Posts tab.",
                files: [],
              },
              {
                source: "Vercel API",
                detail: "The dashboard checks Vercel for the latest deployment state of each site — whether it built successfully, when the last deploy happened, and what the commit message was.",
                files: [],
              },
              {
                source: "Dreaming status (didianolue.co.uk)",
                detail: "The dreaming process is portfolio-wide. After its Sunday run it writes a single status file to the lead site. The Agent Command Centre reads this to show when dreaming last ran and what it found.",
                files: ["dreaming-status.json"],
              },
            ].map(item => (
              <div key={item.source} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{item.source}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">{item.detail}</p>
                {item.files.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.files.map(f => (
                      <code key={f} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {f}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* 8. Five rubrics */}
        <Section title="The Five Quality Rubrics">
          <Prose>
            Each site has its own grader with its own pass/fail criteria. These are the standards
            the grader applies to every draft before approving it. Click each site to see its rubric.
          </Prose>
          <div className="flex flex-col gap-3">
            {RUBRICS.map(r => {
              const c = RUBRIC_COLOURS[r.colour];
              const isOpen = openRubric === r.site;
              return (
                <div key={r.site} className={`rounded-xl border ${c.border} ${c.bg}`}>
                  <button
                    onClick={() => setOpenRubric(isOpen ? null : r.site)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <span className={`text-sm font-semibold ${c.title}`}>{r.site}</span>
                      <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">{r.url} · {r.rubric}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-200/60 dark:border-zinc-700/60 px-4 pb-4 pt-3 flex flex-col gap-2">
                      {r.pass.map(p => (
                        <div key={p} className="flex items-start gap-2 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓</span>
                          <span className="text-zinc-700 dark:text-zinc-300">{p}</span>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 text-xs mt-1">
                        <span className="text-red-500 flex-shrink-0">✗</span>
                        <span className="text-red-700 dark:text-red-400 font-medium">{r.fail}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* 9. Built vs needed */}
        <Section title="What's Built vs. What's Still Needed">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">✓ Built and live</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  "Command Hub dashboard (this site)",
                  "Agent Command Centre panel",
                  "Pipeline tab per site card",
                  "Review Queue in Outstanding tab",
                  "Blotato live post counts",
                  "Vercel deploy status per site",
                  "Dreaming panel",
                  "Today's Focus with agent-aware logic",
                ].map(item => (
                  <li key={item} className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                    <span className="flex-shrink-0">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-3">⚑ Still needed to go live</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  "The actual Claude agents (lead coordinator, 5 subagents, 5 graders)",
                  "Agent code to write JSON files to each site",
                  "Dreaming process configured and scheduled (Sunday)",
                  "Webhook set up to notify you when a batch is ready",
                  "content-coordinator.json deployed to didianolue.co.uk",
                ].map(item => (
                  <li key={item} className="text-xs text-amber-800 dark:text-amber-400 flex items-start gap-1.5">
                    <span className="flex-shrink-0">·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 10. Troubleshooting */}
        <Section title="Troubleshooting">
          <div className="flex flex-col gap-3">
            {[
              {
                problem: "Dashboard shows empty states everywhere",
                solution: "The agents haven't run yet. The dashboard is ready and waiting. Once the agent code is built and the JSON files start being written to your sites, the data will appear automatically.",
              },
              {
                problem: "A site card shows 'Down'",
                solution: "The site failed its uptime check. Check Vercel for a failed deployment, or visit the site directly to confirm.",
              },
              {
                problem: "Grader shows 'fail' for a site",
                solution: "Open that site's Pipeline tab. The failed criterion will be shown in red. The grader will have retried automatically — if it still shows fail after retries, the draft may need a manual rewrite before it's entered into Blotato.",
              },
              {
                problem: "'Batch ready' banner is not appearing",
                solution: "Either the agents haven't finished running yet, or the webhook hasn't been configured. Check the Agent Command Centre for the batch status counts.",
              },
              {
                problem: "Dreaming shows 'Never run'",
                solution: "Dreaming hasn't been configured or scheduled yet — it's on the 'still needed' list. Once set up, it runs automatically every Sunday and the dashboard will reflect it.",
              },
              {
                problem: "Blotato shows 0 scheduled posts for a site",
                solution: "Either no posts have been scheduled in Blotato for that site this week, or the Blotato API key needs checking. Log into Blotato directly to confirm.",
              },
            ].map(item => (
              <div key={item.problem} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">⚠ {item.problem}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.solution}</p>
              </div>
            ))}
          </div>
        </Section>

      </main>

      <footer className="mt-auto border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Command Hub Operations Guide · Didi Anolue · Five-site portfolio
        </p>
      </footer>

    </div>
  );
}
