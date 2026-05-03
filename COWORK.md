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
│   ├── page.tsx              # Main dashboard — site config + PortfolioBar
│   ├── layout.tsx            # Root layout (Geist font, metadata)
│   ├── globals.css
│   ├── login/page.tsx        # Password gate
│   ├── api/
│   │   ├── status/route.ts   # Core aggregator — uptime, Vercel, agents, revenue
│   │   └── auth/route.ts     # Cookie-based auth (HUB_PASSWORD env var)
│   └── components/
│       ├── SiteCard.tsx      # Per-site card — tabs: Revenue, Agents, Outstanding, Marketing
│       ├── TaskList.tsx      # localStorage per-site task list
│       └── RevenueFlow.tsx   # SVG revenue funnel diagram per site
├── proxy.ts                  # Middleware auth guard
├── SITE-AUDIT.md             # Full audit of all five sites — read this
└── COWORK.md                 # This file
```

## What Has Already Been Built (git log)

| Commit | What it added |
|--------|--------------|
| `657882d` | Brand colour accents — stripe, gradient wash, avatar on all cards |
| `a59b34d` | Marketing Plan tab (Buffer + Beehiiv) on MasterYourCareerPath, OldOakTown, AIViralVideoPrompts |
| `e432976` | Revenue Command Hub — PortfolioBar, agent panels, revenue flows, readiness checklists |
| `dcb8c33` | Password protection gate |
| `38b87c5` | Core Command Hub — live status, task lists, social agent links |

## Known Issues (from SITE-AUDIT.md — read that file for full detail)

### CRITICAL
1. **OOT contamination** — all four non-OOT social-agent.html files contain 21
   hardcoded references to Old Oak Town (`oldoaktown.co.uk`, "The Old Oak Weekly",
   "Old Oak Common") baked into the AI system prompts. Any user on MYCP, TCC, AIVVP,
   or Didi who clicks "Newsletter" objective is directed to sign up to the wrong site.

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

## Environment Variables (Vercel)

| Var | Used for |
|-----|---------|
| `VERCEL_TOKEN` | Fetching deploy status from Vercel API |
| `HUB_PASSWORD` | Dashboard login gate |
| `GUMROAD_API_KEY` | Live Gumroad revenue for AIVVP (not yet set) |

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
3. **Run `git log --oneline -10`** to see what was last changed
4. **Confirm the current task with Didi** before making any changes
5. After changes: `git add -A && git commit -m "feat: ..." && git push origin main`

## Current Priority Queue

Work through these in order unless Didi says otherwise:

1. Fix OOT contamination in the four social-agent.html files (CRITICAL — do this first)
2. Wire Stripe (or LemonSqueezy) into TCC `app/command-center/page.tsx` CTA
3. Add `GUMROAD_API_KEY` to Vercel env vars + confirm revenue shows on AIVVP card
4. Add `CLAUDE.md` to Didi, TCC, and AIVVP repos (currently missing)
5. Plan first agent run across all sites to populate dashboard data
