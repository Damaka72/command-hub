# Command Hub — Cowork Project Brief

## What This Project Is

The Command Hub (`dashboard-opal-kappa-70.vercel.app`) is Didi Anolue's
centralised operations dashboard for her five income-generating websites.
It is a **Next.js 16.2.4** app deployed on Vercel via GitHub
(`Damaka72/command-hub`), auto-deploying on every push to `main`.

Stack: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Vercel.

## The Five Sites

| ID | Site | Purpose | Revenue model |
|----|------|---------|---------------|
| `oldoaktown` | oldoaktown.co.uk | Hyperlocal media — Old Oak Common regeneration | Stripe + Supabase directory listings |
| `theconcurrentcontractor` | theconcurrentcontractor.com | UK IT contractors, IR35 content | SaaS £97/mo (not yet wired) |
| `masteryourcareerpath` | masteryourcareerpath.com | Career coaching — Skool community, PRIME/OPERATE | Skool subscriptions + cohorts |
| `aiviralvideoprompts` | aiviralvideoprompts.com | AI prompt packs sold via Gumroad | Gumroad digital sales |
| `didianolue` | didianolue.co.uk | Personal consulting brand | Consulting pipeline |

## Repo Structure

```
command-hub/
├── app/
│   ├── page.tsx              # Main dashboard — site config + PortfolioBar + DailyBriefing
│   ├── layout.tsx            # Root layout (Geist font, metadata)
│   ├── globals.css
│   ├── login/page.tsx        # Password gate
│   ├── api/
│   │   ├── status/route.ts   # Core aggregator — uptime, Vercel, agents, revenue
│   │   ├── tasks/route.ts    # POST — writes tasks.json back to repo via GitHub API
│   │   └── auth/route.ts     # Cookie-based auth (HUB_PASSWORD env var)
│   └── components/
│       ├── DailyBriefing.tsx # Today's Focus banner — daily work queue above PortfolioBar
│       ├── SiteCard.tsx      # Per-site card — tabs: Revenue, Agents, Outstanding, Marketing, Posts
│       ├── TaskList.tsx      # Per-site task list — hydrates from repo, saves via API
│       └── RevenueFlow.tsx   # SVG revenue funnel diagram per site
├── public/
│   └── data/
│       └── tasks.json        # Cross-device task storage — pre-seeded with COWORK items
├── proxy.ts                  # Middleware auth guard
├── SITE-AUDIT.md             # Full audit of all five sites — read this
└── COWORK.md                 # This file
```

## What Has Already Been Built (git log)

| Commit | What it added |
|--------|--------------|
| `50a908b` | Replace Buffer with Blotato — schedule count from REST API, readiness label updated, Marketing Plan tab renamed |
| `657882d` | Brand colour accents — stripe, gradient wash, avatar on all cards |
| `a59b34d` | Marketing Plan tab (Buffer + Beehiiv) on MasterYourCareerPath, OldOakTown, AIViralVideoPrompts |
| `e432976` | Revenue Command Hub — PortfolioBar, agent panels, revenue flows, readiness checklists |
| `dcb8c33` | Password protection gate |
| `38b87c5` | Core Command Hub — live status, task lists, social agent links |

### External repos (social-agent.html OOT contamination fix — May 2026)

| Repo | Commit(s) | Branch |
|------|-----------|--------|
| Masteryourcareerpath | `ab0e327` + `c2c0954` | `main` |
| Theconcurrentcontractor | `5d85246` | `Main` |
| ai-viral-video-prompts | `f9b30c4` + `82af7c4` | `main` |
| didi-anolue-landing-page | `17f56d1` | `main` |

## Known Issues (from SITE-AUDIT.md — read that file for full detail)

### CRITICAL
1. ~~**OOT contamination**~~ **RESOLVED (May 2026)** — All 21 hardcoded Old Oak Town
   references fixed across MYCP, TCC, AIVVP, and Didi social-agent.html files.
   OBJECTIVES sections enriched with per-brand voice, content pillars, and correct
   platform targeting. See external repo commits above.

### High priority
2. **TCC payment button broken** — `app/command-center/page.tsx` has a polished sales
   page (£97/mo, £932/yr) with a "Start Your 30-Day Trial" CTA that does nothing.
   No Stripe / LemonSqueezy wired.
3. **TCC email capture in DEMO_MODE** — CHAOS Assessment stores leads in localStorage
   only. Constant Contact OAuth not set up. Needs: OAuth token, 9 custom fields,
   7-day automation, then `DEMO_MODE=false`.
4. **All agents never run** — every `data/agent-summaries/*.json` across all sites
   shows `never_run`. Dashboard is built but dark.

### Revenue data gaps
5. **AIVVP Gumroad revenue invisible** — `GUMROAD_API_KEY` env var exists in
   `status/route.ts` but key not set in Vercel. Revenue shows `—`.
6. **MYCP Skool revenue invisible** — no Skool API integration. Revenue shows `—`.
7. **Didi pipeline agents never run** — scout, outreach, enquiry all `never_run`.

### Architecture
8. **OOT agent architecture mismatch** — OOT uses standalone Node.js scripts in a
   separate `oldoaktown-agents/` repo; other four sites use
   `data/agent-summaries/*.json`. Dashboard aggregation is architecturally mismatched.

## Content & Scheduling Architecture

Claude Cowork (this agent) talks to **Blotato via MCP** to create and schedule
social posts. Blotato handles all content creation and scheduling. Command Hub
**reads and monitors only** — it calls `GET /schedules` on the Blotato REST API
and counts scheduled posts per site using site-specific account IDs.

```
Claude Cowork  ──MCP──▶  Blotato  (create posts, schedule, manage accounts)
Command Hub    ──REST──▶  Blotato  GET /schedules  (read-only monitoring)
```

Account IDs per site (Instagram / TikTok / Pinterest / YouTube — site-specific only;
Facebook pages and LinkedIn pages share a parent account ID so are excluded from counts):

| Site | Account IDs |
|------|-------------|
| Old Oak Town | `46484` (IG) |
| The Concurrent Contractor | `46494` (IG), `36388` (YT) |
| Master Your Career Path | `46492` (IG), `36387` (YT) |
| AI Viral Video Prompts | `46493` (IG), `41948` (TikTok), `6423` (Pinterest), `36389` (YT) |
| Didi Anolue | `46490` (IG @damaka), `18212` (Twitter/X), `36391` (YT) |

## Agent Architecture (Active vs Retired)

Blotato + Claude Cowork now cover social media creation and scheduling. Three agents are retired:

| Agent | Was on | Verdict | Reason |
|-------|--------|---------|--------|
| `repurpose` | All 5 sites | **Retired** | Claude Cowork + Blotato MCP handles repurposing directly |
| `marketing-assets` | All 5 sites | **Retired** | Claude creates posts via Blotato MCP — no separate agent needed |
| `social` | Didi only | **Retired** | Blotato handles Didi social scheduling |

Retired agents removed from `SITE_AGENT_NAMES` in `status/route.ts`. They no longer appear in Agents tab or agent counts.

Remaining active agents per site type:

| Agent | Sites | Purpose |
|-------|-------|---------|
| `curator` | All | Content research — feeds Claude sessions |
| `newsletter` | All | Beehiiv/email pipeline |
| `health` | All | Site monitoring |
| `seo` | All | Content strategy gaps |
| `insight` | TCC | IR35 news feed |
| `lead-nurture`, `product` | MYCP | MYCP pipeline |
| `prompt-pack` | AIVVP | Product creation |
| `scout`, `outreach`, `cv-tailor`, `packages`, `enquiry` | Didi | Consulting pipeline |

## Task Persistence

Tasks are stored in `public/data/tasks.json` (served at `/data/tasks.json`).

- **Read**: `TaskList` fetches `/data/tasks.json` on mount; falls back to localStorage if unavailable
- **Write**: `TaskList` POSTs to `/api/tasks` which calls the GitHub Contents API to update the file in-repo
- **Cross-device**: any device with hub access sees the same tasks (once `GITHUB_TOKEN` is set)
- **Fallback**: if `GITHUB_TOKEN` not set, tasks save to localStorage only (existing behaviour)

To enable cross-device persistence, add `GITHUB_TOKEN` to Vercel env vars:
1. Go to github.com/settings/tokens → create a fine-grained PAT scoped to `Damaka72/command-hub` with **Contents: Read and write**
2. Add to Vercel → command-hub → Settings → Environment Variables as `GITHUB_TOKEN`

## Environment Variables (Vercel)

| Var | Used for |
|-----|---------|
| `VERCEL_TOKEN` | Fetching deploy status from Vercel API |
| `HUB_PASSWORD` | Dashboard login gate |
| `GUMROAD_API_KEY` | Live Gumroad revenue for AIVVP (not yet set) |
| `BLOTATO_API_KEY` | Blotato schedule count per site (set May 2026) |
| `GITHUB_TOKEN` | Write tasks.json back to repo (cross-device task sync) |

## Coding Standards

- Match existing component styling exactly — same Tailwind classes, same status-pill
  colours (`emerald`/`amber`/`red`), same `rounded-lg bg-zinc-50 dark:bg-zinc-800` panels
- TypeScript strict mode — no `any`, no untyped props
- Client components use `"use client"` at top; data fetching stays in `api/` routes
- Commit format: `feat: [description]` / `fix: [description]` / `refactor: [description]`
- Push to `main` — Vercel auto-deploys. No branches needed for solo work.
- Do not add dependencies without checking `package.json` first

## How to Start Each Session

1. **Read this file** (COWORK.md)
2. **Read SITE-AUDIT.md** — the authoritative record of conflicts and gaps
3. **Open the hub** — Today's Focus panel shows what to work on today
4. **Run `git log --oneline -10`** to see what was last changed
5. **Confirm the current task with Didi** before making any changes
6. After changes: `git add -A && git commit -m "feat: ..." && git push origin main`

## Current Priority Queue

Work through these in order unless Didi says otherwise:

1. ~~Fix OOT contamination in the four social-agent.html files~~ **DONE (May 2026)**
2. ~~Replace Buffer with Blotato~~ **DONE (May 2026)**
3. ~~Daily briefing, agent assessment, cross-device tasks~~ **DONE (May 2026)**
4. **Move TCC workshops to MYCP Skool** — CHAOS + Concurrent Contractor workshops. See WORKSHOP-MIGRATION.md
5. ~~Add `GUMROAD_API_KEY` to Vercel~~ **DONE (May 2026)**
6. ~~Add `GITHUB_TOKEN` to Vercel~~ **DONE (May 2026)**
7. **Add `CLAUDE.md`** to Didi, TCC, and AIVVP repos (3 of 5 missing)
8. **First agent run** — curator + health across all sites (retired agents excluded)
9. **Complete Constant Contact OAuth** for TCC — flip `DEMO_MODE=false` in CHAOS Assessment
10. **Remove Command Center** from TCC site (page, terms, email sequence) — after workshops migrated
