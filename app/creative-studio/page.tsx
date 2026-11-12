"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWeek } from "../context/WeekContext";
import { MEDIA_PLATFORMS, hasMedia, isFilmingBrief, type ReviewRow } from "../review/classify";
import BrandSheets from "./BrandSheets";

// ── Creative Studio ───────────────────────────────────────────────────────────
// The content factory floor: where videos, presentations, infographics, carousels
// and posters get made, all in each brand's own colours and fonts. It leads with
// what can be made and the brand sheets, then this week's media and the weekly
// ladder; the tool catalogue is collapsed reference. (Formerly "Video Studio".)
// Two modes:
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
    avoid: "Anything you need once the subscription lapses: the free column under Choosing a tool covers that.",
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

// What the studio makes, and the quickest good route to each. "ask" is a sentence
// Didi can say to Claude or Cowork as it stands.
const FORMATS: { name: string; what: string; route: string; size: string; ask: string }[] = [
  {
    name: "Video",
    what: "Reels, shorts, explainers, promos and captioned clips.",
    route: "HyperFrames for anything designed (free, exact brand look). An AI story video or your own filming for the rest.",
    size: "1080 × 1920 vertical",
    ask: "Make a 30-second vertical explainer about [topic] for [brand], using its brand sheet.",
  },
  {
    name: "Presentation",
    what: "Decks for a talk, training session, pitch or webinar. Also the base for a LinkedIn document post.",
    route: "Claude Slides (in your plan). Downloads as PowerPoint or PDF.",
    size: "1920 × 1080 slides",
    ask: "Build a 10-slide deck on [topic] for [brand], using its brand sheet. One idea per slide.",
  },
  {
    name: "Infographic",
    what: "One tall image that explains a process, a comparison or a set of numbers.",
    route: "Claude Design (in your plan) or HyperFrames as a still. Blotato Visuals if speed matters more than exact colours.",
    size: "1080 × 1350, or taller for Pinterest",
    ask: "Turn these five steps into an infographic for [brand], using its brand sheet: [steps].",
  },
  {
    name: "Carousel and cards",
    what: "Swipeable slides, quote cards and single text cards.",
    route: "HyperFrames stills for the exact brand look. A Blotato free card when approximate colours will do.",
    size: "1080 × 1350 carousel, 1080 × 1080 single",
    ask: "Make a 6-slide carousel from this post for [brand], using its brand sheet: [post].",
  },
  {
    name: "Poster and visual set",
    what: "Event posters, launch graphics, a matching set of visuals for one campaign.",
    route: "Claude Design (in your plan).",
    size: "Any; say where it will be used",
    ask: "Design a launch poster and three matching social graphics for [campaign] for [brand], using its brand sheet.",
  },
];

// Skills are ready-made instructions Claude follows for one kind of job. These are
// the ones that feed the factory; "have" means it is already on Didi's Claude account.
const SKILLS: { name: string; does: string; state: "have" | "make" }[] = [
  { name: "post-writer and post-grader", does: "Drafts posts in your voice, then marks them against what performs before you see them.", state: "have" },
  { name: "brand-reject-lists", does: "The Brand gate: the words and claims each brand never uses.", state: "have" },
  { name: "video-producer and video-batch-producer", does: "Plans and makes one video, or a week's worth in one go.", state: "have" },
  { name: "canvas-design", does: "Posters, infographics and one-page visuals as finished image files.", state: "have" },
  { name: "pptx", does: "Real PowerPoint files, for decks you will present or send.", state: "have" },
  { name: "theme-factory and brand-guidelines", does: "Applies one consistent look (colours, fonts) to whatever is being made.", state: "have" },
  { name: "Canva: resize for social, bulk create, brand check", does: "One design resized for every platform; many designs from a spreadsheet; a check against a brand kit.", state: "have" },
  { name: "One brand skill per site", does: "Each brand sheet below turned into a skill, so the right colours and fonts are used without being asked.", state: "make" },
  { name: "Carousel builder", does: "Takes one approved post and returns the finished slides in the brand look, ready for the Sunday review.", state: "make" },
  { name: "Infographic builder", does: "Takes steps or numbers and returns a finished brand infographic.", state: "make" },
  { name: "Hook and first-line tester", does: "Offers five opening lines for a post and says which is strongest and why.", state: "make" },
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

const LADDER: { n: number; name: string; cost: string; note: string }[] = [
  { n: 1, name: "Blotato free card", cost: "0 credits", note: "Simple text cards and carousels. Quick, but brand colours are only approximate." },
  { n: 2, name: "HyperFrames", cost: "Free", note: "Exact brand colours and fonts: cards, carousels, reels, explainers. Needs FFmpeg and Chrome." },
  { n: 3, name: "AI story video", cost: "About 1 credit a scene, 100 a week at most", note: "Narrated multi-scene video made in Blotato." },
  { n: 4, name: "You film it", cost: "Your time", note: "Face to camera. It arrives as a script and shot list." },
];

const LIVE_BRANDS: { id: string; name: string }[] = [
  { id: "masteryourcareerpath", name: "Master Your Career Path" },
  { id: "oldoaktown",           name: "Old Oak Town" },
  { id: "aiviralvideoprompts",  name: "AI Viral Video Prompts" },
];

// This week's media, straight from the posts: how many need an image or video, how
// many are made, how many Cowork can still make, and how many only you can film.
function ThisWeeksMedia() {
  const { week } = useWeek();
  const [rows, setRows]     = useState<ReviewRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/review?week=${week}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) setFailed(true); else { setFailed(false); setRows(d.rows ?? []); }
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [week]);

  if (failed) return <Prose>Could not load this week&apos;s posts.</Prose>;
  if (rows === null) return <Prose>Loading this week&apos;s posts…</Prose>;

  const stats = LIVE_BRANDS.map(b => {
    const mine = rows.filter(r => r.site_id === b.id && MEDIA_PLATFORMS.has(r.platform) && r.status !== "rejected");
    const missing = mine.filter(r => !hasMedia(r));
    return {
      name: b.name,
      total: mine.length,
      made: mine.length - missing.length,
      cowork: missing.filter(r => !isFilmingBrief(r)).length,
      filming: missing.filter(r => isFilmingBrief(r)).length,
    };
  });
  const total = stats.reduce((n, x) => n + x.total, 0);
  const weekLabel = new Date(`${week}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (total === 0) {
    return <Prose>No Instagram or TikTok posts drafted for the week of {weekLabel} yet. Cowork drafts on Saturday at 06:55.</Prose>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-panel-2 text-fg">
            <tr>
              <th className="px-4 py-2 font-semibold">Brand</th>
              <th className="px-4 py-2 font-semibold">Need media</th>
              <th className="px-4 py-2 font-semibold">Made</th>
              <th className="px-4 py-2 font-semibold">Cowork can make</th>
              <th className="px-4 py-2 font-semibold">You film</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-panel text-fg-2">
            {stats.map(x => (
              <tr key={x.name}>
                <td className="px-4 py-2 font-medium text-fg">{x.name}</td>
                <td className="px-4 py-2">{x.total}</td>
                <td className={`px-4 py-2 ${x.made === x.total && x.total > 0 ? "text-ok font-semibold" : ""}`}>{x.made}</td>
                <td className={`px-4 py-2 ${x.cowork > 0 ? "text-warn font-semibold" : ""}`}>{x.cowork}</td>
                <td className={`px-4 py-2 ${x.filming > 0 ? "text-warn font-semibold" : ""}`}>{x.filming}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Prose>
        Week of {weekLabel}. &ldquo;Cowork can make&rdquo; is picked up by the media desk every morning at 07:30. &ldquo;You film&rdquo; are
        scripts only you can do. <Link href={`/review?week=${week}`} className="text-accent-text underline">Open the Sunday review →</Link>
      </Prose>
    </div>
  );
}

function Disclosure({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-panel">
      <summary className="cursor-pointer list-none flex items-baseline justify-between gap-3 px-5 py-3">
        <span className="text-sm font-semibold text-fg">{title}</span>
        {hint && <span className="text-xs text-fg-3">{hint}</span>}
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

export default function CreativeStudioPage() {
  const shortVideoUp = useLocalToolStatus();

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                Creative Studio
              </h1>
              <p className="mt-1 text-sm text-fg-2">
                Videos, presentations, infographics and carousels, in every brand&rsquo;s own look
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

      <main className="mx-auto max-w-4xl px-6 py-10 flex flex-col gap-10">

        <Section title="What you can make">
          <Prose>
            Think of this page as the factory floor and each brand sheet as the mould: whatever is made here comes out in
            that brand&rsquo;s colours and fonts. Say any of these sentences to Claude or Cowork, swapping in your topic and brand.
          </Prose>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {FORMATS.map(f => (
              <li key={f.name} className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-5">
                <h3 className="text-sm font-bold text-fg">{f.name}</h3>
                <p className="text-xs leading-relaxed text-fg-2">{f.what}</p>
                <dl className="flex flex-col gap-1 text-xs leading-relaxed text-fg-2">
                  <div><dt className="inline font-semibold text-fg">Made with: </dt><dd className="inline">{f.route}</dd></div>
                  <div><dt className="inline font-semibold text-fg">Size: </dt><dd className="inline">{f.size}</dd></div>
                </dl>
                <p className="mt-auto rounded-lg bg-panel-2 px-3 py-2 text-xs italic text-fg">&ldquo;{f.ask}&rdquo;</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Brand sheets">
          <Prose>
            One sheet per brand, read from each site&rsquo;s own code: colours and what each is for, fonts, a default card, voice
            and the rules. Open one, press Copy, and paste it in with your request. Points marked &ldquo;to confirm&rdquo; are yours to settle.
          </Prose>
          <BrandSheets />
        </Section>

        <Section title="This week's media">
          <ThisWeeksMedia />
        </Section>

        <Section title="How media gets made">
          <Prose>
            Cowork starts at the top and stops at the first rung that does the job. It never uses Higgsfield: there are no credits.
          </Prose>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LADDER.map(r => (
              <li key={r.n} className="flex flex-col gap-1.5 rounded-xl border border-line bg-panel p-4">
                <span className="text-xs font-semibold text-accent-text">Step {r.n}</span>
                <span className="text-sm font-bold text-fg">{r.name}</span>
                <span className="text-xs font-medium text-ok">{r.cost}</span>
                <span className="text-xs leading-relaxed text-fg-2">{r.note}</span>
              </li>
            ))}
          </ol>
          <Prose>
            Cowork makes what it can every Saturday, and again every morning at 07:30 for any post still missing media. A post
            missing media has an Ask Cowork to create it button in the Sunday review. Old Oak Town only ever gets typographic
            cards or your own real photos, never AI imagery.
          </Prose>
        </Section>

        <Section title="Asking for something yourself">
          <Prose>
            Describe it to Claude or Cowork in plain words. If you name a tool, it uses that tool. If you leave it open, it
            follows the steps above, and the finished video is attached to a post and appears in the Sunday review before
            anything is scheduled. Presentations and infographics are made in Claude and kept there for you to edit, download
            and share; attach one to a post the same way as any other image or file.
          </Prose>
        </Section>

        <Section title="Reference">
          <Disclosure title="Skills that feed the factory" hint="What you have, and what to add next">
            <Prose>
              A skill is like a recipe card Claude keeps in a drawer: written once, followed the same way every time. The ones
              marked &ldquo;To make&rdquo; do not exist yet and are the next steps towards a full content factory. &ldquo;You have this&rdquo;
              means it was on your Claude account when this list was written (November 2026).
            </Prose>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {SKILLS.map(k => (
                <li key={k.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm leading-relaxed text-fg-2">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${k.state === "have" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
                    {k.state === "have" ? "You have this" : "To make"}
                  </span>
                  <span className="min-w-0"><span className="font-semibold text-fg">{k.name}. </span>{k.does}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title="Every video tool" hint="Cost, where it runs, what it is for">
            <div className="grid gap-4 sm:grid-cols-2">
              {TOOLS.map(t => (
                <ToolCard key={t.id} t={t}>
                  {t.id === "short-video-maker" && <StatusDot up={shortVideoUp} />}
                </ToolCard>
              ))}
            </div>
          </Disclosure>

          <Disclosure title="Claude's own creative tools" hint="Design, Slides, Dashboard">
            <Prose>
              These run inside Claude, not in this hub. Ask for them in Claude or Cowork and the result is kept as an artifact you
              can edit and share. They are covered by the Claude plan, so there are no extra credits to track.
            </Prose>
            <div className="grid gap-4 sm:grid-cols-2">
              {CLAUDE_TOOLS.map(t => (
                <ToolCard key={t.id} t={t} />
              ))}
            </div>
          </Disclosure>

          <Disclosure title="Choosing a tool" hint="Rules, by need, by brand">
            <ul className="flex flex-col gap-3">
              {RULES.map(r => (
                <li key={r.title} className="text-sm leading-relaxed text-fg-2">
                  <span className="font-semibold text-fg">{r.title}. </span>{r.body}
                </li>
              ))}
            </ul>
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
            <ul className="flex flex-col gap-3">
              {BY_SITE.map(x => (
                <li key={x.url} className="text-sm leading-relaxed text-fg-2">
                  <span className="font-semibold text-fg">{x.site}</span>
                  <span className="text-fg-3"> · {x.url} · </span>{x.note}
                </li>
              ))}
            </ul>
            <Prose>
              If Blotato lapses, its carousels and infographics move to HyperFrames, and scheduling moves to wherever posts are
              published next. Everything in the free column keeps working with no subscription.
            </Prose>
          </Disclosure>

          <Disclosure title="Starting short-video-maker" hint="Only on your own computer">
            <Prose>
              It runs in Docker on Didi&apos;s computer. If the status light on its card is red, open Docker Desktop, wait for
              &ldquo;Engine running&rdquo;, then run <code className="rounded px-1 py-0.5 text-[0.85em] bg-panel-2">docker compose up -d</code> in
              the <code className="rounded px-1 py-0.5 text-[0.85em] bg-panel-2">short-video-maker</code> folder. The light only works from the same computer.
            </Prose>
          </Disclosure>
        </Section>

      </main>
    </div>
  );
}
