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
      <h2 className="text-base font-bold text-fg border-b border-line pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-fg-2 leading-relaxed">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded px-1 py-0.5 text-[0.85em] bg-panel-2 text-fg">
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
        On <Code>/plan</Code>, pick a content pillar and theme for each of the three pipeline sites
        (MYCP, OOT, AIVVP) and save. Then on the dashboard press <Code>▶ Run pipeline</Code> and
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
  { path: "/video-studio", name: "Video Studio",   what: "Every video tool (HyperFrames, short-video-maker, Video Brief, Higgsfield, Blotato) with cost, best use, example prompts and the rules the video-producer agent follows to choose." },
  { path: "/guide",       name: "Ops Guide",      what: "This page." },
];

// ── Sites ─────────────────────────────────────────────────────────────────────

const PIPELINE_SITES: { site: string; url: string; rubric: string; primary: string }[] = [
  { site: "Master Your Career Path", url: "masteryourcareerpath.com",    rubric: "Career transformation rubric", primary: "LinkedIn" },
  { site: "Old Oak Town",            url: "oldoaktown.co.uk",             rubric: "No-fabrication rubric",         primary: "Instagram" },
  { site: "AI Viral Video Prompts",  url: "aiviralvideoprompts.com",      rubric: "Conversion rubric",             primary: "TikTok" },
];

const PUBLICATIONS: { title: string; site: string; send: string }[] = [
  { title: "The Prompt-ly", site: "AI Viral Video Prompts",           send: "Wednesday" },
  { title: "The Pathway",   site: "MYCP", send: "Tuesday" },
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
    <div className="min-h-screen bg-bg">

      {/* Header */}
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Operations Guide
              </h1>
              <p className="mt-1 text-sm text-fg-2">
                How the Command Hub works · the weekly rhythm · what feeds it
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors border-line-2 text-fg hover:brightness-125"
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
            scheduled posts, revenue — and it drives the weekly content pipeline for three of them
            (MYCP, OOT, AIVVP). From here you set the week&rsquo;s plan, run the pipeline, review
            and edit drafts, push approved posts to Blotato, build the newsletters, and read the Friday
            report. It is not read-only.
          </Prose>
          <Prose>
            The other two sites, <strong>Didi Anolue</strong> and <strong>World of Contracts</strong>, are
            monitored only — each has a site card, and World of Contracts has a work tracker at{" "}
            <Code>/trackers/world-of-contracts</Code> (shown on the Home page summary). Neither is{" "}
            <strong>ever part of pipeline automation</strong>: nothing on <Code>/plan</Code>,{" "}
            <Code>/review</Code>, or the pipeline touches them.
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
                ? "bg-accent-dim border-accent/70"
                : "bg-ok/15 border-ok/60";
              const dayC = row.who === "you"
                ? "text-accent-text"
                : "text-ok";
              const whoC = row.who === "you"
                ? "bg-accent-dim text-accent-text"
                : "bg-ok/15 text-ok";
              return (
                <div key={i} className={`rounded-xl border px-4 py-4 ${bg}`}>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-xs font-bold ${dayC}`}>{row.day}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${whoC}`}>
                      {row.who === "you" ? "You" : "Automatic"}
                    </span>
                    <span className="text-sm font-semibold text-fg">{row.action}</span>
                  </div>
                  <p className="text-xs text-fg-2 leading-relaxed">{row.detail}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 4. The pages */}
        <Section title="The Pages">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-panel">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Page</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Route</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">What you do there</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel">
                {PAGES.map(p => (
                  <tr key={p.path}>
                    <td className="px-4 py-3 font-medium text-fg whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-fg-2 whitespace-nowrap">{p.path}</td>
                    <td className="px-4 py-3 text-fg-2">{p.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 5. Pipeline sites + Didi */}
        <Section title="The Three Pipeline Sites (and Didi)">
          <Prose>
            The pipeline drafts, grades, and publishes for these three sites. Each has its own grader
            rubric — a draft that fails is flagged in Review with the failing criterion so you can fix
            or reject it.
          </Prose>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-panel">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Site</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Primary platform</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Grader rubric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel">
                {PIPELINE_SITES.map(row => (
                  <tr key={row.url}>
                    <td className="px-4 py-3 text-fg">
                      {row.site}
                      <span className="ml-1 font-mono text-[12px] text-fg-3">{row.url}</span>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{row.primary}</td>
                    <td className="px-4 py-3 text-fg-2">{row.rubric}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border px-4 py-3 border-accent/70 bg-accent-dim">
            <p className="text-sm font-semibold text-accent-text mb-1">Didi Anolue — monitored, not automated</p>
            <p className="text-xs text-accent-text leading-relaxed">
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
          <div className="rounded-xl border px-4 py-4 border-line bg-panel">
            <p className="text-sm font-semibold text-fg mb-1">Text posts — pushed from Review</p>
            <p className="text-xs text-fg-2 leading-relaxed">
              <Code>Push approved to Blotato</Code> on <Code>/review</Code> schedules each approved text
              post on its weekday, at the platform&rsquo;s London wall-clock time (BST/GMT handled
              automatically): <strong>LinkedIn 08:00</strong>, <strong>Facebook 10:00</strong>,{" "}
              <strong>Twitter/X 12:00</strong>. If a slot has already passed, it rolls to the next
              week&rsquo;s occurrence. A pushed row shows its scheduled time and Blotato submission id; a
              failed push keeps the row approved with the error, so you can retry.
            </p>
          </div>
          <div className="rounded-xl border px-4 py-4 border-line bg-panel">
            <p className="text-sm font-semibold text-fg mb-1">Media posts — via the Sunday Cowork brief</p>
            <p className="text-xs text-fg-2 leading-relaxed">
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
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-panel">
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Publication</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Draws from</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-fg-2">Usual send</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel">
                {PUBLICATIONS.map(p => (
                  <tr key={p.title}>
                    <td className="px-4 py-3 font-medium text-fg whitespace-nowrap">{p.title}</td>
                    <td className="px-4 py-3 text-fg-2">{p.site}</td>
                    <td className="px-4 py-3 text-fg-2 whitespace-nowrap">{p.send}</td>
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
              <div key={f.source} className="rounded-xl border px-4 py-4 border-line bg-panel">
                <p className="text-sm font-semibold text-fg mb-1">{f.source}</p>
                <p className="text-xs text-fg-2 leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. Pipeline is manual */}
        <Section title="The Pipeline Is Manual">
          <div className="rounded-xl border px-4 py-4 border-warn/60 bg-warn/15">
            <p className="text-sm font-semibold text-warn mb-1">Nothing generates or publishes on its own</p>
            <p className="text-xs text-warn leading-relaxed">
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
              <div key={item.problem} className="rounded-xl border px-4 py-4 border-line bg-panel">
                <p className="text-sm font-semibold text-fg mb-1">⚠ {item.problem}</p>
                <p className="text-xs text-fg-2 leading-relaxed">{item.solution}</p>
              </div>
            ))}
          </div>
        </Section>

      </main>

      <footer className="mt-auto border-t py-6 border-line bg-panel">
        <p className="text-center text-xs text-fg-3">
          Command Hub Operations Guide · Didi Anolue · Five-site portfolio
        </p>
      </footer>

    </div>
  );
}
