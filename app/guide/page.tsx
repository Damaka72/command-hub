"use client";

import Link from "next/link";

// ── Operations Guide ──────────────────────────────────────────────────────────
// A working reference for the Command Hub: how a week of posts happens, who does
// what, and what to do when something looks wrong. The design behind it is in
// docs/social-team-design.md. It is not a tutorial; it assumes Didi knows her
// own business.

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

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-left text-xs">
        <thead className="bg-panel-2 text-fg">
          <tr>{head.map(h => <th key={h} className="px-4 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line bg-panel text-fg-2">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2 align-top ${j === 0 ? "font-medium text-fg whitespace-nowrap" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

const WEEK: React.ReactNode[][] = [
  ["Last Saturday of the month", "Cowork", "Drafts next month's base posts (evergreen) and checks them. You approve them once."],
  ["Saturday 06:55",             "Cowork", "Researches each brand, drafts the week's focus posts, runs the Brand gate, makes the cards and story videos."],
  ["Saturday",                   "Cowork", "Leaves everything ready for you in the Sunday review."],
  ["Sunday, about 15 minutes",   "You",    "Open the Sunday review. Decide the flagged posts, approve everything ready in one action, check the media list."],
  ["Sunday",                     "Cowork", "Schedules what you approved in Blotato at the right London times."],
  ["Monday to Saturday",         "Blotato","Posts publish by themselves."],
  ["Wednesday 07:00",            "Cowork", "Looks for real news per brand. Drafts at most one reactive post, for your same-day yes. Posts nothing if nothing real has happened."],
  ["Friday",                     "You",    "Read the Friday report and Cowork's short note on what worked."],
];

const LAYERS: React.ReactNode[][] = [
  ["Base",  "3 ideas a week", "Evergreen posts that rotate through the brand's pillars. Made monthly. No prices or offers, because they are written weeks ahead."],
  ["Focus", "2 ideas a week", "The posts you put attention on: timely, with a card or video. Steered by your Weekly focus."],
  ["Flex",  "1 idea a week",  "A reactive post from the Wednesday news check, only if something real happens."],
];

const BUCKETS: React.ReactNode[][] = [
  ["Needs your decision", "The Brand gate flagged it, blocked it, or it failed to publish. Each card says why.", "Edit, approve (flagged only) or reject"],
  ["Ready to approve",    "The Brand gate passed it.", "Approve all ready, in one action"],
  ["Not yet checked",     "The Brand gate has not looked at it yet.", "Ask Cowork to check, or approve one at a time"],
  ["Needs media",         "Instagram and TikTok cannot publish without an image or video.", "Ask Cowork to create it, or film it yourself"],
  ["Approved",            "You approved it. It is waiting for Cowork to schedule.", "Tell Cowork: schedule this week"],
  ["Scheduled",           "It is in Blotato with a publish time.", "Nothing"],
];

const WHO: React.ReactNode[][] = [
  ["You",         "See and approve in the hub. Film what only you can film. Steer the week on Weekly focus."],
  ["Cowork",      "Researches, drafts, checks, makes the visuals, schedules, runs the Wednesday news check, writes the Friday note."],
  ["Claude Code", "Builds and fixes the hub. Does not create, change or publish posts."],
];

const PAGES: React.ReactNode[][] = [
  ["/",             "Home",           "The morning paper: faith, health check, today, overnight, insights."],
  ["/plan",         "Weekly focus",   "Set a pillar, theme or note per brand to steer the week. Shows Cowork's research brief, read-only."],
  ["/review",       "Sunday review",  "Where you see and approve the week's posts."],
  ["/newsletters",  "Newsletters",    "The Pathway, The Prompt-ly and The Oak: drafts and queue."],
  ["/friday",       "Friday",         "Planned against published, revenue and subscribers."],
  ["/library",      "Library",        "Every post across weeks and months."],
  ["/social",       "Social",         "The connected accounts per brand."],
  ["/creative-studio", "Creative Studio", "Videos, presentations, infographics and carousels; the brand sheets; every tool."],
  ["/ops",          "Operations",     "Site health, deploys, revenue and trackers."],
];

const TROUBLE: React.ReactNode[][] = [
  ["No posts for the week", "Cowork has not drafted yet. It drafts on Saturday at 06:55. Ask Cowork to run the weekly draft now."],
  ["Everything says Not yet checked", "The Brand gate has not run. Ask Cowork to run the Brand gate for the week."],
  ["A post says Blocked", "It broke a hard rule (for example a retired fact or a claim the live site contradicts). Edit the wording and save; it goes back for a re-check."],
  ["Approved, but nothing is scheduled", "Tell Cowork: schedule this week. If Cowork cannot, the Fallback panel at the bottom of the Sunday review does the same from the hub."],
  ["A post was skipped when scheduling", "Its day had already passed. Edit it for another day, or reject it. Posts are never moved a week later."],
  ["An Instagram or TikTok post will not publish", "It has no media. Press Ask Cowork to create it, or film it and paste the link."],
  ["A fact looks out of date", "Tell Cowork. Rules live in Cowork's brand rules, and the Brand gate re-checks every post against the live site in the week it goes out."],
];

const DATA: React.ReactNode[][] = [
  ["Supabase",  "The hub's own database: the posts and their statuses (content_library), Weekly focus, Cowork's research briefs, newsletters and the action log."],
  ["Blotato",   "Scheduling and publishing to every social account, and post analytics where the platform supports them."],
  ["Beehiiv",   "The newsletters: The Pathway, The Prompt-ly and The Oak."],
  ["Drive",     "The Command Hub Content Library: finished media, one folder per brand."],
];

// How to brief Claude: the habits that most improve what comes back.
const BRIEFING: React.ReactNode[][] = [
  ["Say what done looks like", "Name the result you will see, who it is for, and what to leave alone.", "\u201cThe scrollbar is too thin to see; make it easy to grab. Do not change the colours.\u201d"],
  ["Show an example", "One example beats a paragraph of description. Paste a post, screenshot or link. For anything visual, copy the brand sheet from Creative Studio and paste it in.", "\u201cLike this post, but for World of Contracts. Brand sheet below.\u201d"],
  ["One job per conversation", "Small, single-purpose conversations give sharper results and are easier to check.", "Start a new conversation for each separate job."],
  ["Ask for a plan first", "For anything bigger than a quick fix. Two minutes reading a plan catches a wrong turn before an hour of building.", "\u201cShow me your plan before you start.\u201d"],
  ["Ask for proof", "You get screenshots and test results, and a plain statement of what was not checked.", "\u201cShow me how you tested it.\u201d"],
  ["Write standing rules down once", "Anything you repeat belongs in the project\u2019s instruction file, which Claude reads at the start of every conversation.", "\u201cAdd this to the project instructions: always use UK English.\u201d"],
  ["Turn repeated jobs into skills", "A skill is a recipe card: written once, followed the same way every time. Sweat the assets you already have before adding a new tool.", "\u201cMake a skill for turning an approved post into a carousel.\u201d"],
  ["Close the loop", "Work stalls on unanswered questions. Two words are enough.", "\u201cOption A.\u201d or \u201cLeave it.\u201d"],
  ["React to the first draft", "Saying what is wrong with a draft gets further than a longer brief up front.", "\u201cToo formal. Shorter. Lead with the day rate.\u201d"],
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-bg">

      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Operations Guide
              </h1>
              <p className="mt-1 text-sm text-fg-2">
                How a week of posts happens · who does what · what to do when something looks wrong
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

        <Section title="What the Command Hub is">
          <Prose>
            The hub is where you see and approve. Cowork does the work behind it. Three brands run through it today:
            Master Your Career Path, Old Oak Town and AI Viral Video Prompts. World of Contracts will join later as
            a new brand on the same process. Nothing is published or scheduled without your approval.
          </Prose>
        </Section>

        <Section title="The week">
          <Table head={["When", "Who", "What happens"]} rows={WEEK} />
        </Section>

        <Section title="The three layers of posts">
          <Prose>
            Think of a magazine: standing columns, a cover story, and a news flash. Each brand posts daily, Monday to
            Saturday, as six ideas a week. Each idea is written once and adapted for each platform, so you review
            ideas, not dozens of separate posts.
          </Prose>
          <Table head={["Layer", "Per week", "What it is"]} rows={LAYERS} />
        </Section>

        <Section title="The Sunday review">
          <Prose>
            Read it from the top. The sections run from most to least in need of you.
          </Prose>
          <Table head={["Section", "What it means", "What you do"]} rows={BUCKETS} />
        </Section>

        <Section title="The Brand gate">
          <Prose>
            After Cowork drafts, every post is checked against the brand&rsquo;s rules (retired facts, claims it
            cannot back up, prices and product status against the live site). The result is shown on the post:
            <strong> ready</strong> (safe to approve in one action), <strong>flagged</strong> (you decide) or{" "}
            <strong>blocked</strong> (fix it first; it can never be approved or scheduled as it stands). If you edit
            a post, it goes back for a re-check.
          </Prose>
        </Section>

        <Section title="Media and video">
          <Prose>
            Cowork makes cards and story videos for free or very cheaply. Anything only you can film arrives as a
            script and shot list. The whole flow is on the <Link href="/creative-studio" className="text-accent-text underline">Creative Studio</Link> page.
          </Prose>
        </Section>

        <Section title="Who does what">
          <Table head={["Who", "Does"]} rows={WHO} />
        </Section>

        <Section title="The pages">
          <Table head={["Path", "Name", "What it is for"]} rows={PAGES} />
        </Section>

        <Section title="Where the data lives">
          <Table head={["System", "What it holds"]} rows={DATA} />
        </Section>

        <Section title="How to brief Claude">
          <Prose>
            Treat Claude like a skilled contractor on a building job: what you get back depends mostly on the brief, the
            reference material and when you inspect the work. Before adding any new tool, ask: what do I want to make each
            week that I cannot make today, and is the gap a missing tool or a missing habit?
          </Prose>
          <Table head={["Habit", "Why", "What to say"]} rows={BRIEFING} />
          <Prose>
            Start with three: say what done looks like, ask for a plan first, and close the loop. Open questions waiting on
            you are listed on each site&rsquo;s tracker.
          </Prose>
        </Section>

        <Section title="If something looks wrong">
          <Table head={["You see", "What to do"]} rows={TROUBLE} />
        </Section>

      </main>
    </div>
  );
}
