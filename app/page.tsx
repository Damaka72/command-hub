"use client";

import { useEffect, useState } from "react";
import SiteCard from "./components/SiteCard";

const sites = [
  {
    id: "oldoaktown",
    name: "Old Oak Town",
    url: "oldoaktown.co.uk",
    description: "Hyperlocal news & community for Old Oak Common regeneration",
    github: "https://github.com/Damaka72/oldoaktown",
    admin: "https://oldoaktown.co.uk/admin",
    socialAgent: "https://oldoaktown.co.uk/social-agent",
  },
  {
    id: "theconcurrentcontractor",
    name: "The Concurrent Contractor",
    url: "theconcurrentcontractor.com",
    description: "IR35, contracting resources and community",
    github: "https://github.com/Damaka72/Theconcurrentcontractor",
    admin: "https://www.theconcurrentcontractor.com/admin",
    socialAgent: "https://www.theconcurrentcontractor.com/social-agent",
  },
  {
    id: "masteryourcareerpath",
    name: "Master Your Career Path",
    url: "masteryourcareerpath.com",
    description: "Career development, coaching and PRIME/OPERATE frameworks",
    github: "https://github.com/Damaka72/Masteryourcareerpath",
    admin: "https://masteryourcareerpath.com/admin",
    socialAgent: "https://masteryourcareerpath.com/social-agent",
  },
  {
    id: "aiviralvideoprompts",
    name: "AI Viral Video Prompts",
    url: "aiviralvideoprompts.com",
    description: "AI-powered prompts for creating viral video content",
    github: "https://github.com/Damaka72/ai-viral-video-prompts",
    admin: "https://aiviralvideoprompts.com/admin",
    socialAgent: "https://aiviralvideoprompts.com/social-agent",
  },
  {
    id: "didianolue",
    name: "Didi Anolue",
    url: "didianolue.co.uk",
    description: "Personal consultancy site — procurement & commercial leadership",
    github: "https://github.com/Damaka72/didi-anolue-landing-page",
    admin: "https://didianolue.co.uk/admin",
    socialAgent: "https://didianolue.co.uk/social-agent",
  },
];

type StatusMap = Record<string, {
  up: boolean;
  deploy: { state: string; ago: string; commitMessage: string } | null;
  agent: { status: string; ago: string | null } | null;
}>;

export default function Home() {
  const [statusMap, setStatusMap] = useState<StatusMap | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(setStatusMap)
      .catch(() => setStatusMap({}));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Command Hub
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Didi Anolue · {sites.length} sites
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
              {statusMap === null ? (
                <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" />
              ) : (
                <span className={`h-2 w-2 rounded-full ${Object.values(statusMap).every(s => s.up) ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              )}
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {statusMap === null ? 'Checking…' : `${Object.values(statusMap).filter(s => s.up).length}/${sites.length} up`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              status={statusMap?.[site.id]}
            />
          ))}
        </div>
      </main>

      <footer className="mt-auto border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Tasks saved in browser · Status refreshes on load
        </p>
      </footer>
    </div>
  );
}
