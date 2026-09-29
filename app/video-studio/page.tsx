"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── Video Studio ──────────────────────────────────────────────────────────────
// The room where video gets made. It lists every video tool Didi can use, what
// each costs, when to pick it, and how to ask Claude / Cowork to use it. The
// video-producer agent reads the same rules: budget and video type decide the
// tool, and naming a tool always overrides.

type Cost = "free" | "credits" | "subscription";

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
    costNote: "Free, open source",
    runsOn: "Local (Dev folder, renders to MP4)",
    makes: "Custom explainers, promos, title cards, captioned clips, animated overlays, slideshows",
    bestFor: "Anything designed: branded explainers, product walkthroughs, data or text-led motion. Full control of look and timing.",
    avoid: "Photoreal footage of people or places. It animates designs, it does not generate footage.",
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

const COST_STYLE: Record<Cost, string> = {
  free:         "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  credits:      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  subscription: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
};

const COST_LABEL: Record<Cost, string> = {
  free: "Free",
  credits: "Credits",
  subscription: "Subscription",
};

const RULES: { title: string; body: string }[] = [
  { title: "Name a tool and it wins", body: "If you say which tool to use, the agent uses it. The rules below only apply when you leave it open." },
  { title: "Free first", body: "With no budget stated, the agent chooses between HyperFrames and short-video-maker. It only reaches for credit or subscription tools when the video needs something they alone can do." },
  { title: "Paid only for what free cannot do", body: "Face-to-camera with Didi's likeness, product ads from a URL and cinematic AI footage go to Higgsfield. Scheduling-ready carousels and infographics go to Blotato." },
  { title: "Old Oak Town is factual", body: "Real uploaded photos only. Never AI-generated imagery or stock footage. Blotato Visuals with real photos, or HyperFrames with real photos as the source." },
  { title: "No promotions unless confirmed", body: "No prices or offers in a video unless Didi has confirmed the campaign is live that week." },
  { title: "Check before scheduling", body: "Run finished videos through the Higgsfield virality predictor when credits allow, then send to the Review queue." },
];

const BY_TYPE: { need: string; free: string; paid: string }[] = [
  { need: "Quick tip or educational short from a script", free: "short-video-maker", paid: "Video Brief" },
  { need: "Branded explainer or product walkthrough", free: "HyperFrames", paid: "Higgsfield Marketing Studio (from a URL)" },
  { need: "Face-to-camera authority video (Didi)", free: "HyperFrames talking-head overlays on footage Didi records", paid: "Higgsfield Soul Character" },
  { need: "Carousel, quote series or infographic", free: "HyperFrames (rendered as slides or stills)", paid: "Blotato Visuals" },
  { need: "Product ad from a URL", free: "HyperFrames (product-launch style)", paid: "Higgsfield Marketing Studio" },
  { need: "Local area slideshow (Old Oak Town)", free: "HyperFrames with real photos", paid: "Blotato Image Slideshow with real photos" },
  { need: "Reframe 16:9 to 9:16", free: "HyperFrames or ffmpeg", paid: "Higgsfield Reframe" },
];

const BY_SITE: { site: string; url: string; note: string }[] = [
  { site: "Didi Anolue", url: "didianolue.co.uk", note: "LinkedIn, X. Authority and expertise. Talking-head style and repurposed posts." },
  { site: "Master Your Career Path", url: "masteryourcareerpath.com", note: "LinkedIn, Instagram, TikTok. Tips, product promos (only if a campaign is confirmed), 9:16 talking-head." },
  { site: "Old Oak Town", url: "oldoaktown.co.uk", note: "Real photos only. No AI imagery, no stock footage, no invented events or statistics." },
  { site: "The Concurrent Contractor", url: "theconcurrentcontractor.com", note: "LinkedIn, X. IR35 explainers, stats infographics, authority video." },
  { site: "AI Viral Video Prompts", url: "aiviralvideoprompts.com", note: "TikTok, Instagram, X. The natural home for showcasing AI video tools." },
];

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
  const color = up === null ? "bg-zinc-400" : up ? "bg-emerald-500" : "bg-red-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function VideoStudioPage() {
  const shortVideoUp = useLocalToolStatus();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Video Studio
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Every video tool in one place · what each costs · which to pick
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

        <Section title="How to use it">
          <Prose>
            Describe the video you want to Claude or Cowork, in plain words. The video-producer agent picks the tool
            from the rules below. To choose yourself, name the tool in your request (the example prompts on each card
            show how). Finished videos go to the Review queue before anything is scheduled.
          </Prose>
        </Section>

        <Section title="The tools">
          <div className="grid gap-4 sm:grid-cols-2">
            {TOOLS.map(t => (
              <article key={t.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COST_STYLE[t.cost]}`}>
                    {COST_LABEL[t.cost]}
                  </span>
                </div>
                {t.id === "short-video-maker" && <StatusDot up={shortVideoUp} />}
                <dl className="flex flex-col gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <div><dt className="inline font-semibold text-zinc-800 dark:text-zinc-200">Cost: </dt><dd className="inline">{t.costNote}</dd></div>
                  <div><dt className="inline font-semibold text-zinc-800 dark:text-zinc-200">Runs on: </dt><dd className="inline">{t.runsOn}</dd></div>
                  <div><dt className="inline font-semibold text-zinc-800 dark:text-zinc-200">Makes: </dt><dd className="inline">{t.makes}</dd></div>
                  <div><dt className="inline font-semibold text-zinc-800 dark:text-zinc-200">Best for: </dt><dd className="inline">{t.bestFor}</dd></div>
                  <div><dt className="inline font-semibold text-zinc-800 dark:text-zinc-200">Avoid for: </dt><dd className="inline">{t.avoid}</dd></div>
                </dl>
                <p className="mt-auto rounded-lg bg-zinc-100 px-3 py-2 text-xs italic text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  “{t.ask}”
                </p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="How the agent chooses">
          <ul className="flex flex-col gap-3">
            {RULES.map(r => (
              <li key={r.title} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{r.title}. </span>{r.body}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="By video type: free or paid">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-2 font-semibold">You need</th>
                  <th className="px-4 py-2 font-semibold">Free route</th>
                  <th className="px-4 py-2 font-semibold">Paid route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white text-zinc-600 dark:divide-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                {BY_TYPE.map(r => (
                  <tr key={r.need}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{r.need}</td>
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
              <li key={s.url} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{s.site}</span>
                <span className="text-zinc-500"> · {s.url} · </span>{s.note}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Starting short-video-maker">
          <Prose>
            It runs in Docker on Didi&apos;s computer. If the status light above is red, open Docker Desktop, wait for
            &ldquo;Engine running&rdquo;, then run <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] dark:bg-zinc-800">docker compose up -d</code> in
            the <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] dark:bg-zinc-800">short-video-maker</code> folder. The light only works from the same computer.
          </Prose>
        </Section>

      </main>
    </div>
  );
}
