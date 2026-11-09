"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── Video Studio ──────────────────────────────────────────────────────────────
// The room where video gets made. It explains how media reaches a post (the
// weekly flow), then lists every video tool Didi can use, what each costs, when
// to pick it, and how to ask Claude / Cowork to use it. Two modes:
//   * Automatic: Cowork's weekly run and media desk follow a fixed, cheap ladder.
//   * On request: Didi names a tool and it wins.

type Cost = "free" | "credits" | "subscription" | "included";

interface Tool {
  id: string;
  name: string;
  cost: Cost;
  costNote: string;
  runsOn: string;
  makes: string;
  bestFor: string;
  avoid: string;
  ask: string;
}

const TOOLS: Tool[] = [
  {
    id: "hyperframes",
    name: "HyperFrames",
    cost: "free",
    costNote: "Free, open source. No credits",
    runsOn: "Your computer (Dev folder), or any session with FFmpeg and Chrome. A 10-second 9:16 video renders in about 5 seconds",
    makes: "Branded text cards and carousel slides (as still images), 9:16 reels, explainers, promos, captioned clips, slide decks, animated overlays",
    bestFor: "Anything designed, in the exact brand colours and fonts (Blotato's free templates cannot match them). Carousels, Instagram and TikTok reels, explainers, slides. Full control of look and timing, and it costs nothing.",
    avoid: "Photoreal footage of people or places: it animates designs, it does not generate footage. Narration and music need a separate audio file, because local voice and music are not installed.",
    ask: "Use HyperFrames to make a 45-second explainer about [topic] for [site], 9:16.",
  },
  {
    id: "short-video-maker",
    name: "short-video-maker",
    cost: "free",
    costNote: "Free (Pexels stock footage + local voice)",
    runsOn: "Local Docker container, port 3123",
    makes: "Vertical shorts: narrated text over stock footage with captions and music",
    bestFor: "Fast, high-volume tips and educational shorts for TikTok, Reels and Shorts when a script already exists.",
    avoid: "Old Oak Town (stock footage is not local or factual). Anything needing a specific look or Didi's face.",
    ask: "Use short-video-maker: make a 30-second tip video from this script for [site].",
  },
  {
    id: "video-brief",
    name: "Video Brief",
    cost: "credits",
    costNote: "Uses account credits",
    runsOn: "Hosted",
    makes: "A finished video from a script, topic, vibe, audience and platform",
    bestFor: "Repurposing a written post into video quickly, with less visual control.",
    avoid: "Old Oak Town. Anything that needs precise visual control.",
    ask: "Use Video Brief to turn this LinkedIn post into a video, [vibe], for [platform].",
  },
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    cost: "credits",
    costNote: "Credit-based, the priciest option",
    runsOn: "Hosted (connected to Claude)",
    makes: "Cinematic AI video, product ads from a URL, Soul Character (Didi's face), reframe, upscale, virality score",
    bestFor: "High production value: face-to-camera authority video, product ads, AI-showcase content for aiviralvideoprompts.com.",
    avoid: "Old Oak Town (AI imagery looks fabricated). Routine volume content, where free tools do the job.",
    ask: "Use Higgsfield Marketing Studio to make a product ad from [URL], 9:16.",
  },
  {
    id: "blotato",
    name: "Blotato Visuals",
    cost: "subscription",
    costNote: "Needs an active Blotato subscription",
    runsOn: "Hosted, feeds Blotato scheduling",
    makes: "Carousels, infographics, quote cards, slideshows, AI story videos, combine clips",
    bestFor: "Text-led content that goes straight to scheduling. Old Oak Town, using real uploaded photos.",
    avoid: "Anything you need if the subscription has lapsed. See the fallback table below.",
    ask: "Use Blotato Visuals to make a Tutorial Carousel: [topic] for [site].",
  },
];

// Claude's own creative tools. They live inside claude.ai, so the hub cannot
// embed them; it holds the recipes (what to ask for, per site) and the rules.
// Cost is "included": covered by the Claude plan, no separate credits.
const CLAUDE_TOOLS: Tool[] = [
  {
    id: "claude-design",
    name: "Claude Design",
    cost: "included",
    costNote: "Included with the Claude plan",
    runsOn: "Inside Claude (claude.ai), kept as an artifact",
    makes: "Landing pages, UI mockups, posters, flyers, invites, ads and visual social posts on an editable canvas",
    bestFor: "Anything judged by looking at it: a landing page for a product, a poster for an event, a set of social visuals in one brand style.",
    avoid: "Old Oak Town, unless built only from real uploaded photos. No AI-generated imagery for that site.",
    ask: "Use Claude Design to make a LinkedIn quote-card set for [site], three options, brand colours.",
  },
  {
    id: "claude-slides",
    name: "Claude Slides",
    cost: "included",
    costNote: "Included with the Claude plan",
    runsOn: "Inside Claude (claude.ai), downloads as PowerPoint or PDF",
    makes: "16:9 presentation decks you can page through, edit and download",
    bestFor: "Community training sessions, consulting proposals and talks, and carousels built as slides first.",
    avoid: "Short vertical video. Use HyperFrames for anything that needs to move.",
    ask: "Use Claude Slides to make a 10-slide deck on [topic] for [site], with speaker notes.",
  },
  {
    id: "claude-dashboard",
    name: "Claude Dashboard",
    cost: "included",
    costNote: "Included with the Claude plan",
    runsOn: "Inside Claude (claude.ai), kept as an artifact",
    makes: "Charts, KPI tiles and tables where every number shows its source",
    bestFor: "Weekly performance reports per site, and anything where figures must be traceable. Pairs with the Friday and Saturday analysis.",
    avoid: "Live monitoring. The hub's own home page already does that.",
    ask: "Use Claude Dashboard to report last week's post performance for [site] from this export, with sources.",
  },
];

const COST_STYLE: Record<Cost, string> = {
  included:     "bg-accent-dim text-accent-text",
  free:         "bg-ok/15 text-ok",
  credits:      "bg-warn/15 text-warn",
  subscription: "bg-accent-dim text-accent-text",
};

const COST_LABEL: Record<Cost, string> = {
  included: "In plan",
  free: "Free",
  credits: "Credits",
  subscription: "Subscription",
};

const RULES: { title: string; body: string }[] = [
  { title: "The weekly ladder", body: "Automatic runs go down this list and stop at the first rung that does the job. 1. A Blotato free text card or carousel (0 credits) when a simple card is enough. 2. HyperFrames (free) when it needs exact brand colours and fonts, or is a carousel, reel or explainer, whenever the session can run it. 3. A Blotato AI story video (about 1 credit a scene, capped at 100 credits a run) for narrated multi-scene video. 4. A video brief for you to film. Higgsfield is not used: there are no credits." },
  { title: "Name a tool and it wins", body: "If you ask for a specific tool in a session, it is used. The rules below apply when you leave it open." },
  { title: "HyperFrames needs FFmpeg and Chrome", body: "It runs on your computer and in any session set up with them. A session that cannot run it drops to the next rung, never skips the post. short-video-maker runs only on your computer, so it is for sessions you run there." },
  { title: "Paid only for what free cannot do", body: "Face-to-camera with your likeness, product ads from a URL and cinematic AI footage need Higgsfield, which only runs when it has credits and you ask for it." },
  { title: "Old Oak Town is factual", body: "Typographic cards, or your own real photos. Never AI-generated imagery or stock footage." },
  { title: "No promotions unless confirmed", body: "No prices or offers in a video unless you have confirmed the campaign is live that week." },
  { title: "Check before scheduling", body: "Run finished videos through the Higgsfield virality predictor when credits allow, then they appear in the Sunday review." },
];

const BY_TYPE: { need: string; free: string; paid: string }[] = [
  { need: "Quick tip or educational short from a script", free: "short-video-maker", paid: "Video Brief" },
  { need: "Branded explainer or product walkthrough", free: "HyperFrames", paid: "Higgsfield Marketing Studio (from a URL)" },
  { need: "Face-to-camera authority video (Didi)", free: "HyperFrames talking-head overlays on footage Didi records", paid: "Higgsfield Soul Character" },
  { need: "Carousel, quote series or infographic", free: "HyperFrames (rendered as slides or stills)", paid: "Blotato Visuals" },
  { need: "Product ad from a URL", free: "HyperFrames (product-launch style)", paid: "Higgsfield Marketing Studio" },
  { need: "Local area slideshow (Old Oak Town)", free: "HyperFrames with real photos", paid: "Blotato Image Slideshow with real photos" },
  { need: "Reframe 16:9 to 9:16", free: "HyperFrames or ffmpeg", paid: "Higgsfield Reframe" },
  { need: "Landing page, poster or social visual set", free: "Claude Design (in plan)", paid: "Blotato Visuals" },
  { need: "Presentation deck (training session, proposal, talk)", free: "Claude Slides (in plan)", paid: "None needed" },
  { need: "Sourced performance report for a site", free: "Claude Dashboard (in plan)", paid: "None needed" },
];

const BY_SITE: { site: string; url: string; note: string }[] = [
  { site: "Didi Anolue", url: "didianolue.co.uk", note: "LinkedIn, X. Authority and expertise. Talking-head style and repurposed posts." },
  { site: "Master Your Career Path", url: "masteryourcareerpath.com", note: "LinkedIn, Instagram, TikTok, Facebook. Tips, product promos (only if a campaign is confirmed), 9:16 talking-head." },
  { site: "Old Oak Town", url: "oldoaktown.co.uk", note: "Typographic cards or real photos only. No AI imagery, no stock footage, no invented events or statistics." },
  { site: "AI Viral Video Prompts", url: "aiviralvideoprompts.com", note: "TikTok, Instagram, Facebook, LinkedIn. The natural home for showcasing AI video tools." },
];

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

function ToolCard({ t, children }: { t: Tool; children?: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border p-5 border-line bg-panel">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-fg">{t.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COST_STYLE[t.cost]}`}>
          {COST_LABEL[t.cost]}
        </span>
      </div>
      {children}
      <dl className="flex flex-col gap-2 text-xs leading-relaxed text-fg-2">
        <div><dt className="inline font-semibold text-fg">Cost: </dt><dd className="inline">{t.costNote}</dd></div>
        <div><dt className="inline font-semibold text-fg">Runs on: </dt><dd className="inline">{t.runsOn}</dd></div>
        <div><dt className="inline font-semibold text-fg">Makes: </dt><dd className="inline">{t.makes}</dd></div>
        <div><dt className="inline font-semibold text-fg">Best for: </dt><dd className="inline">{t.bestFor}</dd></div>
        <div><dt className="inline font-semibold text-fg">Avoid for: </dt><dd className="inline">{t.avoid}</dd></div>
      </dl>
      <p className="mt-auto rounded-lg px-3 py-2 text-xs italic bg-panel-2 text-fg">
        “{t.ask}”
      </p>
    </article>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-fg-2 leading-relaxed">{children}</p>;
}

// short-video-maker lives on Didi's machine, so this is checked from her own
// browser. A no-cors fetch resolves if something answers on the port and
// rejects if not; it never exposes the response.
function useLocalToolStatus() {
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      fetch("http://localhost:3123/health", { mode: "no-cors", signal: ctrl.signal })
        .then(() => !cancelled && setUp(true))
        .catch(() => !cancelled && setUp(false))
        .finally(() => clearTimeout(t));
    };
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return up;
}

function StatusDot({ up }: { up: boolean | null }) {
  const label = up === null ? "Checking" : up ? "Running" : "Not running";
  const color = up === null ? "bg-fg-2" : up ? "bg-ok" : "bg-bad";
  return (
    <span className="flex items-center gap-1.5 text-xs text-fg-2">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function VideoStudioPage() {
  const shortVideoUp = useLocalToolStatus();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Video Studio
              </h1>
              <p className="mt-1 text-sm text-fg-2">
                How video reaches a post · every tool · what each costs
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

        <Section title="How video reaches a post">
          <ol className="flex flex-col gap-3 list-decimal pl-5">
            <li className="text-sm leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">Saturday 06:55. </span>
              Cowork drafts the week and makes what it can for free: text cards and carousels from Blotato&apos;s free
              templates or HyperFrames, plus one or two AI story videos. A weekly run never spends more than 100 Blotato
              credits.
            </li>
            <li className="text-sm leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">Only you can film some. </span>
              Face-to-camera posts arrive as a video brief: a script and shot list. In the Sunday review they sit under
              Needs media, marked Needs filming.
            </li>
            <li className="text-sm leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">Anything else missing media. </span>
              Press Ask Cowork to create it on the post. That records the request. Cowork&apos;s media desk picks it up
              when you tell Cowork to run the media desk, and on its Sunday morning retry. It uses the cheapest tool that
              does the job and attaches the result to the post.
            </li>
            <li className="text-sm leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">You film the briefs. </span>
              Upload the video anywhere public and paste its link into the post&apos;s media links.
            </li>
            <li className="text-sm leading-relaxed text-fg-2">
              <span className="font-semibold text-fg">Then review. </span>
              A post with its media attached goes through the Brand gate and appears in the Sunday review.
              You approve; Cowork schedules.
            </li>
          </ol>
        </Section>

        <Section title="Asking for a video yourself">
          <Prose>
            Describe the video you want to Claude or Cowork, in plain words. If you name a tool, it uses that tool. If you
            leave it open, it chooses from the rules below. Finished videos are attached to a post and appear in the Sunday
            review before anything is scheduled.
          </Prose>
        </Section>

        <Section title="The tools">
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOLS.map(t => (
              <ToolCard key={t.id} t={t}>
                {t.id === "short-video-maker" && <StatusDot up={shortVideoUp} />}
              </ToolCard>
            ))}
          </div>
        </Section>

        <Section title="Claude's own creative tools">
          <Prose>
            These run inside Claude, not in this hub, so the hub cannot embed them. Ask for them in Claude or Cowork and
            the result is kept as an artifact you can edit and share. They are covered by the Claude plan, so there are no
            extra credits to track. Claude Motion (short animations) is a Team and Enterprise beta only, so it is left
            out here: HyperFrames above does the same job for free.
          </Prose>
          <div className="grid gap-4 sm:grid-cols-2">
            {CLAUDE_TOOLS.map(t => (
              <ToolCard key={t.id} t={t} />
            ))}
          </div>
        </Section>

        <Section title="How the agent chooses">
          <ul className="flex flex-col gap-3">
            {RULES.map(r => (
              <li key={r.title} className="text-sm leading-relaxed text-fg-2">
                <span className="font-semibold text-fg">{r.title}. </span>{r.body}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="By need: free or paid">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-panel-2 text-fg">
                <tr>
                  <th className="px-4 py-2 font-semibold">You need</th>
                  <th className="px-4 py-2 font-semibold">Free route</th>
                  <th className="px-4 py-2 font-semibold">Paid route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel text-fg-2">
                {BY_TYPE.map(r => (
                  <tr key={r.need}>
                    <td className="px-4 py-2 font-medium text-fg">{r.need}</td>
                    <td className="px-4 py-2">{r.free}</td>
                    <td className="px-4 py-2">{r.paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Prose>
            If Blotato lapses, its carousels and infographics move to HyperFrames, and scheduling moves to wherever posts are
            published next. Everything in the free column keeps working with no subscription.
          </Prose>
        </Section>

        <Section title="By site">
          <ul className="flex flex-col gap-3">
            {BY_SITE.map(s => (
              <li key={s.url} className="text-sm leading-relaxed text-fg-2">
                <span className="font-semibold text-fg">{s.site}</span>
                <span className="text-fg-3"> · {s.url} · </span>{s.note}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Starting short-video-maker">
          <Prose>
            It runs in Docker on Didi&apos;s computer. If the status light above is red, open Docker Desktop, wait for
            &ldquo;Engine running&rdquo;, then run <code className="rounded px-1 py-0.5 text-[0.85em] bg-panel-2">docker compose up -d</code> in
            the <code className="rounded px-1 py-0.5 text-[0.85em] bg-panel-2">short-video-maker</code> folder. The light only works from the same computer.
          </Prose>
        </Section>

      </main>
    </div>
  );
}
