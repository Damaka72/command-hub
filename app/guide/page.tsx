"use client";

import Link from "next/link";

// ── Operations Guide ──────────────────────────────────────────────────────────
// A working reference for the Command Hub as it actually exists after Phases 1–4.
// It describes the real weekly rhythm, the pages, how publishing works, and what
// feeds the Hub. It is not a tutorial — it assumes Didi knows her own business.

// ── Small building blocks ─────────────────────────────────────────────────────

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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </code>
  );
}

// ── Weekly rhythm data ────────────────────────────────────────────────────────

const RHYTHM: {
  day: string;
  who: "you" | "auto";
  action: string;
  detail: React.ReactNode;
}[] = [
  {
    day: "Saturday",
    who: "you",
    action: "Research session (Cowork)",
    detail: (
      <>
        Run the Cowork research session. It writes a <Code>research_brief</Code> per site into Supabase.
        These are read-only in the Hub — they surface under each site on <Code>/plan</Code> and inside
        the matching newsletter tab.
      </>
    ),
  },
  {
    day: "Saturday / Sunday",
    who: "you",
    action: "Set the plan, then run the pipeline",
    detail: (
      <>
        On <Code>/plan</Code>, pick a content pillar and theme for each of the four pipeline sites
        (MYCP, TCC, OOT, AIVVP) and save. Then on the dashboard press <Code>▶ Run pipeline</Code> and
        confirm. This is a <strong>manual trigger — the pipeline never runs on its own</strong>. It
        generates five drafts per site (one per weekday) into the content library.
      </>
    ),
  },
  {
    day: "Sunday",
    who: "you",
    action: "Review queue → push to Blotato",
    detail: (
      <>
        On <Code>/review</Code>, edit, approve, or reject each draft. Approved <em>text</em> posts push
        straight to Blotato at the correct per-platform London times. Media posts (Instagram / TikTok /
        Pinterest / YouTube) are handled from the Sunday checklist&rsquo;s Cowork brief instead —
        expand it from the <Code>▼ Sunday checklist</Code> button at the top of <Code>/review</Code>.
      </>
    ),
  },
  {
    day: "Sunday",
    who: "you",
    action: "Newsletters",
    detail: (
      <>
        On <Code>/newsletters</Code>, pull grader-passed content into each publication, draft and
        finalise it, then <Code>Copy formatted for Beehiiv</Code> and paste into Beehiiv to send. Mark
        it sent when done.
      </>
    ),
  },
  {
    day: "Weekdays",
    who: "auto",
    action: "Blotato publishes · daily check",
    detail: (
      <>
        Blotato publishes what you approved on its scheduled day — no action needed. Do a ~5-minute
        Command Hub check each day: sites up, deploys green, nothing stuck in the queue.
      </>
    ),
  },
  {
    day: "Friday",
    who: "you",
    action: "Friday report",
    detail: (
      <>
        On <Code>/friday</Code>: planned vs published per site, newsletter status, Gumroad this week vs
        last, and log each publication&rsquo;s subscriber count (Beehiiv has no API on the free plan, so
        this is manual).
      </>
    ),
  },
  {
    day: "Anytime",
    who: "you",
    action: "Library",
    detail: (
      <>
        On <Code>/library</Code>, browse every past post across all weeks and <strong>repurpose</strong>{" "}
        any of it — edit a copy and drop it in as a fresh draft for a chosen site/week/day. The original
        is never touched.
      </>
    ),
  },
];

// ── Pages reference ───────────────────────────────────────────────────────────

const PAGES: { path: string; name: string; what: string }[] = [
  { path: "/",            name: "Dashboard",      what: "Monitoring + control: site status, deploys, the automation panel (coordinator, pipeline runner, activity), tasks, and the Portfolio bar. Each site's own panel holds its research, admin, and site-specific tools." },
  { path: "/plan",        name: "Weekly Plan",    what: "Set each pipeline site's pillar, theme, and notes for a week, and generate/save each site's Saturday research brief. Saving here is what the pipeline reads." },
  { path: "/review",      name: "Review Queue",   what: "Edit / approve / reject this week's drafts, then push approved text posts to Blotato. The Sunday checklist (YouTube rotation, coordinator links, Cowork brief) collapses in here too." },
  { path: "/newsletters", name: "Newsletters",    what: "Draft the three publications from repurposed content and finalise them for a Beehiiv paste-send." },
  { path: "/friday",      name: "Friday Report",  what: "End-of-week retrospective: planned vs published, newsletter status, Gumroad, subscriber log." },
  { path: "/library",     name: "Content Library",what: "Browse and repurpose all past content across every week." },
  { path: "/guide",       name: "Ops Guide",      what: "This page." },
];

// ── Sites ─────────────────────────────────────────────────────────────────────

const PIPELINE_SITES: { site: string; url: string; rubric: string; primary: string }[] = [
  { site: "Master Your Career Path", url: "masteryourcareerpath.com",    rubric: "Career transformation rubric", primary: "LinkedIn" },
  { site: "The Concurrent Contractor", url: "theconcurrentcontractor.com", rubric: "Contractor lens rubric",       primary: "LinkedIn" },
  { site: "Old Oak Town",            url: "oldoaktown.co.uk",             rubric: "No-fabrication rubric",         primary: "Instagram" },
  { site: "AI Viral Video Prompts",  url: "aiviralvideoprompts.com",      rubric: "Conversion rubric",             primary: "TikTok" },
];

const PUBLICATIONS: { title: string; site: string; send: string }[] = [
  { title: "The Prompt-ly", site: "AI Viral Video Prompts",           send: "Wednesday" },
  { title: "The Pathway",   site: "MYCP + The Concurrent Contractor", send: "Tuesday" },
  { title: "The Oak",       site: "Old Oak Town",                     send: "Thursday" },
];

const FEEDS: { source: string; detail: string }[] = [
  { source: "Supabase", detail: "The Hub's own database — the source of truth for weekly_plan, research_briefs, content_library (drafts + statuses), newsletters, subscriber counts, and cached pipeline_site_data." },
  { source: "Blotato API", detail: "Live scheduled-post counts per site, and the destination the Review queue pushes approved posts to." },
  { source: "Vercel API", detail: "Latest production deploy state, age, and commit message for each site card." },
  { source: "Gumroad", detail: "AI Viral Video Prompts revenue — shown on the Friday report and the AIVVP card." },
  { source: "GitHub Actions", detail: "Runs the content pipeline when you trigger it. The dashboard shows its live steps and last-run result." },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
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
                How the Command Hub works · the weekly rhythm · what feeds it
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

        {/* 1. What it is */}
        <Section title="What the Command Hub is">
          <Prose>
            The Hub is both a monitor and a workspace. It watches all five sites — up/down, deploys,
            scheduled posts, revenue — and it drives the weekly content pipeline for four of them
            (MYCP, TCC, OOT, AIVVP). From here you set the week&rsquo;s plan, run the pipeline, review
            and edit drafts, push approved posts to Blotato, build the newsletters, and read the Friday
            report. It is not read-only.
          </Prose>
          <Prose>
            The fifth site, <strong>Didi Anolue</strong>, is monitored only — it has a site card, its
            own task list, the consulting deals board, and appears in the Blotato feed, but it is{" "}
            <strong>never part of pipeline automation</strong>. Nothing on <Code>/plan</Code>,{" "}
            <Code>/review</Code>, or the pipeline touches it.
          </Prose>
        </Section>

        {/* 2. Login */}
        <Section title="Login &amp; access">
          <Prose>
            The entire Hub is behind a single password. One correct entry on <Code>/login</Code> sets a
            session that lasts about a month; after that you log in again. There are no per-user
            accounts and no per-page logins — every page and every API is gated by the same cookie, so
            if you can see the dashboard you can use everything.
          </Prose>
        </Section>

        {/* 3. Weekly rhythm */}
        <Section title="The Weekly Rhythm">
          <Prose>
            This is the spine of the whole system. Most weeks are the same shape:
          </Prose>
          <div className="flex flex-col gap-3">
            {RHYTHM.map((row, i) => {
              const bg = row.who === "you"
                ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";
              const dayC = row.who === "you"
                ? "text-indigo-700 dark:text-indigo-400"
                : "text-emerald-700 dark:text-emerald-400";
              const whoC = row.who === "you"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300";
              return (
                <div key={i} className={`rounded-xl border px-4 py-4 ${bg}`}>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-xs font-bold ${dayC}`}>{row.day}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${whoC}`}>
                      {row.who === "you" ? "You" : "Automatic"}
                    </span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{row.action}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{row.detail}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 4. The pages */}
        <Section title="The Pages">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Page</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Route</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">What you do there</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {PAGES.map(p => (
                  <tr key={p.path}>
                    <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{p.path}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 5. Pipeline sites + Didi */}
        <Section title="The Four Pipeline Sites (and Didi)">
          <Prose>
            The pipeline drafts, grades, and publishes for these four sites. Each has its own grader
            rubric — a draft that fails is flagged in Review with the failing criterion so you can fix
            or reject it.
          </Prose>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Site</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Primary platform</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Grader rubric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {PIPELINE_SITES.map(row => (
                  <tr key={row.url}>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {row.site}
                      <span className="ml-1 font-mono text-[12px] text-zinc-400 dark:text-zinc-500">{row.url}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.primary}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.rubric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Didi Anolue — monitored, not automated</p>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              didianolue.co.uk shows up as a site card, in the daily task list, and in the Blotato
              scheduled-post feed, so you can keep an eye on it. But it is deliberately excluded from the
              plan, the pipeline, and the Review push path — its content stays handled personally.
            </p>
          </div>
        </Section>

        {/* 6. How publishing works */}
        <Section title="How Publishing Works">
          <Prose>
            Approving a draft doesn&rsquo;t post it — it queues it. Pushing is what schedules it in
            Blotato, and Blotato then publishes on the day.
          </Prose>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Text posts — pushed from Review</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <Code>Push approved to Blotato</Code> on <Code>/review</Code> schedules each approved text
              post on its weekday, at the platform&rsquo;s London wall-clock time (BST/GMT handled
              automatically): <strong>LinkedIn 08:00</strong>, <strong>Facebook 10:00</strong>,{" "}
              <strong>Twitter/X 12:00</strong>. If a slot has already passed, it rolls to the next
              week&rsquo;s occurrence. A pushed row shows its scheduled time and Blotato submission id; a
              failed push keeps the row approved with the error, so you can retry.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Media posts — via the Sunday Cowork brief</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Instagram, TikTok, Pinterest, and YouTube need media attached, so they aren&rsquo;t pushed
              from Review directly. The Sunday checklist (expand it from <Code>/review</Code>) holds a
              ready-made Cowork brief that posts those to Blotato with their own scheduling rules. Rows
              that need media are flagged in Review as &ldquo;Needs media&rdquo; and held back from the
              text push.
            </p>
          </div>
        </Section>

        {/* 7. Newsletters */}
        <Section title="Newsletters">
          <Prose>
            Three publications, each drawing on the sites shown below. There is no Beehiiv API on the
            free plan, so the flow ends in a copy-and-paste: pull grader-passed content, draft, finalise,{" "}
            <Code>Copy formatted for Beehiiv</Code>, paste into Beehiiv, send, then mark it sent.
          </Prose>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Publication</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Draws from</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Usual send</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {PUBLICATIONS.map(p => (
                  <tr key={p.title}>
                    <td className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{p.title}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.site}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{p.send}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 8. What feeds the Hub */}
        <Section title="What Feeds the Hub">
          <Prose>
            The Hub stores its own working data in Supabase and reads live status from four external
            services on each load. Nothing here depends on JSON files hosted on the sites anymore (that
            path survives only as an offline pipeline fallback).
          </Prose>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEEDS.map(f => (
              <div key={f.source} className="rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{f.source}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. Pipeline is manual */}
        <Section title="The Pipeline Is Manual">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Nothing generates or publishes on its own</p>
            <p className="text-xs text-amber-800/90 dark:text-amber-400 leading-relaxed">
              The pipeline only runs when you press <Code>▶ Run pipeline</Code> on the dashboard and
              confirm — it warns you first that it publishes to Blotato. It produces five drafts per site
              (one per weekday) into the content library. From there, nothing reaches the public until{" "}
              <strong>you</strong> approve and push. The only thing that happens automatically is Blotato
              releasing posts you already scheduled.
            </p>
          </div>
        </Section>

        {/* 10. Troubleshooting */}
        <Section title="Troubleshooting">
          <div className="flex flex-col gap-3">
            {[
              {
                problem: "Review queue is empty for the week",
                solution: "The pipeline hasn't run for that week. Set the plan on /plan, then Run pipeline from the dashboard and refresh Review.",
              },
              {
                problem: "\"Run pipeline\" says no GITHUB_TOKEN",
                solution: "Triggering from the dashboard needs GITHUB_TOKEN configured. Without it the pipeline can still be run from GitHub Actions directly.",
              },
              {
                problem: "A push failed",
                solution: "The row stays Approved with the error shown. Common causes: BLOTATO_API_KEY missing, or the platform isn't in the account map / needs media. Fix and push again.",
              },
              {
                problem: "A draft shows a grader fail",
                solution: "The failing criterion is shown on the item. Edit the text to satisfy it and re-approve, or reject it.",
              },
              {
                problem: "A site card shows Down",
                solution: "The uptime check failed. Check Vercel for a failed deploy, or open the site directly to confirm.",
              },
              {
                problem: "Scheduled count is 0 for a site",
                solution: "Either nothing is scheduled in Blotato for that site this week, or the Blotato key needs checking. Log into Blotato to confirm.",
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
