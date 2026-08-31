# Site Audit — Didi Anolue Multi-Site Portfolio
Generated: 2026-04-23

---

## 1. Didi Anolue Consulting (`didi-anolue-landing-page`)

**Site:** didianolue.co.uk | **Platforms:** Facebook, Instagram, LinkedIn

### Agent Status

| Filename | Status |
|---|---|
| `curator.json` | `never_run` |
| `cv-tailor.json` | `never_run` |
| `enquiry.json` | `never_run` |
| `health.json` | `never_run` |
| `newsletter.json` | `never_run` |
| `outreach.json` | `never_run` |
| `packages.json` | `never_run` |
| `repurpose.json` | `never_run` |
| `scout.json` | `never_run` |
| `seo.json` | `never_run` |
| `social.json` | `never_run` |

Largest agent set of all five sites (11 agents). Unique to this site: `cv-tailor`, `outreach`, `packages`, `scout`, `social`.

### Social Agent
- **Present:** ✓ (`social-agent.html` at root)
- **Research sources:** Procurement & contracts news · Public sector updates · Commercial leadership insights · Industry & market trends · LinkedIn thought leadership (off by default)
- **⚠ OOT contamination:** 21 hardcoded references to `oldoaktown.co.uk`, "The Old Oak Weekly", and "Old Oak Common" embedded in the AI system prompts — see Conflicts section

### Buffer
- **Connected:** ✓ (architecture wired via `/api/buffer-post`) — API keys must be set in environment to function

### Newsletter / Email List
- **Provider:** ✗ None connected. Admin UI says "copy into your email platform (Mailchimp, Beehiiv, etc.)" — purely manual

### Revenue Data Source
- **Gumroad:** ✗ None
- **Stripe:** ✗ None
- **Bookings/Calendly:** ✗ None referenced
- **Notes:** Pipeline agents (`scout`, `outreach`, `packages`) suggest a consultancy lead pipeline but no payment system is connected. Revenue is invisible to admin.

### Admin Hub (`admin/index.html`)
Sections and actions:

| Section | Panels |
|---|---|
| Overview | Dashboard (agent status, needs attention, tools, pipeline summary) |
| Pipeline | Opportunities, Outreach, CV Library, Applications, Enquiries |
| Content | Curator, Newsletter, Repurpose, Social (→ link to social-agent.html) |
| Site | SEO Gaps, Site Health, View Site (external link) |

### CLAUDE.md
- **Present:** ✗ Not at project root. Only present inside `hyperframes/` subdirectory (unrelated).

---

## 2. Master Your Career Path (`Masteryourcareerpath`)

**Site:** masteryourcareerpath.com | **Platforms:** LinkedIn, Instagram, Facebook

### Agent Status

| Filename | Status |
|---|---|
| `curator.json` | `never_run` |
| `enquiry.json` | `never_run` |
| `health.json` | `never_run` |
| `lead-nurture.json` | `never_run` |
| `newsletter.json` | `never_run` |
| `product.json` | `never_run` |
| `repurpose.json` | `never_run` |
| `seo.json` | `never_run` |

Unique to this site: `lead-nurture`, `product`.

### Social Agent
- **Present:** ✓ (`social-agent.html` at root)
- **Research sources:** Career change & transition · Leadership & promotion advice · UK jobs market & salary data · Coaching & personal development · LinkedIn thought leadership (off by default)
- **Pipeline logs reference:** Guardian Careers, BBC Worklife, HBR, CIPD, GOV.UK
- **⚠ OOT contamination:** 21 hardcoded Old Oak Town references in AI system prompts — see Conflicts section

### Buffer
- **Connected:** ✓ (architecture wired via `/api/buffer-post`)

### Newsletter / Email List
- **Provider:** ✗ None connected. Admin says "copy into your email platform (Mailchimp, Beehiiv, etc.)" — manual only
- **Lead Nurture agent** exists but admin panel shows raw `claude "Draft a 5-email nurture sequence…"` terminal command rather than an integrated runner

### Revenue Data Source
- **Skool:** Referenced in CLAUDE.md (Free tier, $27/mo PRIME, £325 live cohort, £455 OPERATE, £197 CV-to-Website) but no Skool API integration in admin — revenue invisible
- **Gumroad / Stripe:** ✗ None

### Admin Hub (`admin/index.html`)

| Section | Panels |
|---|---|
| Overview | Dashboard (agent status, needs attention, quick actions) |
| Content | Curator, Newsletter, Repurpose, Social Agent (→ external link) |
| Products | Products, Lead Nurture, Enquiries |
| Site | SEO Gaps, Site Health, View Site |

### CLAUDE.md
- **Present:** ✓ — Documents site purpose (PRIME/OPERATE frameworks), Skool tier pricing, deployment (Vercel, static HTML). Instructs: do not change framework names, do not remove Skool links, do not alter pricing.

---

## 3. The Concurrent Contractor (`Theconcurrentcontractor`)

**Site:** theconcurrentcontractor.com | **Platforms:** LinkedIn, Twitter/X, Facebook

### Agent Status

| Filename | Status |
|---|---|
| `curator.json` | `never_run` |
| `enquiry.json` | `never_run` |
| `health.json` | `never_run` |
| `insight.json` | `never_run` |
| `newsletter.json` | `never_run` |
| `repurpose.json` | `never_run` |
| `seo.json` | `never_run` |

Unique to this site: `insight` (Contract Insight).

### Social Agent
- **Present:** ✓ (`public/social-agent.html` — in `public/` unlike all other sites)
- **Research sources:** IR35 & contractor tax news · Rate Radar — market rates · HMRC & public sector updates · ContractorUK & IT Contracting · Legal & compliance briefings (off by default)
- **Pipeline logs reference:** HMRC updates, ContractorUK, Find a Tender
- **⚠ OOT contamination:** 21 hardcoded Old Oak Town references in AI system prompts — see Conflicts section

### Buffer
- **Connected:** ✓ (architecture wired via `/api/buffer-post`)

### Newsletter / Email List
- **Provider:** Constant Contact — API integration built, but currently in **DEMO_MODE** (no emails actually sent; submissions stored in localStorage only)
- **To go live:** requires OAuth setup, 9 custom fields created in Constant Contact, 7-day automation configured, then `DEMO_MODE=false` in `.env.local`

### Revenue Data Source
- **SaaS product:** "Single Contract Command Center™" — pricing page at `app/command-center/page.tsx` shows £97/month or £932/year. CTA button ("Start Your 30-Day Trial") is **non-functional** — no payment integration wired (no Stripe, no redirect).
- **Gumroad / Stripe:** ✗ Not referenced

### App Pages (Next.js)
**`app/command-center/page.tsx`** — Public sales page for "Single Contract Command Center™":
- Three pillars: Real-Time Visibility, Automated Admin, Optimisation Tools
- Pricing: £97/mo (was £297) or £932/yr; 30-day money-back guarantee
- Social proof section with placeholder testimonials (SJ, MK, LP) and stats (467 contractors, 6,284 hrs/week, £2.4M)
- CTA button wired to nothing — no payment processor

**`app/demo-dashboard/page.tsx`** — Dev/testing tool:
- Displays CHAOS Assessment form submissions from `localStorage`
- Shows what data *would* be sent to Constant Contact (email, capacityScore, hiddenCost, availableHours, etc.)
- Blocks on Constant Contact OAuth before going live
- Not a production page; for internal testing only

### Admin Hub (`admin/index.html`)

| Section | Panels |
|---|---|
| Overview | Dashboard (agent status, needs attention, quick actions) |
| Content | Curator, Newsletter, Repurpose, Contract Insight |
| Pipeline | Enquiries |
| Site | SEO Gaps, Site Health, View Site |

### CLAUDE.md
- **Present:** ✗ None at project root

---

## 4. AI Viral Video Prompts (`ai-viral-video-prompts`)

**Site:** aiviralvideoprompts.com | **Platforms:** TikTok, Instagram, Twitter/X, YouTube

### Agent Status

| Filename | Status |
|---|---|
| `curator.json` | `never_run` |
| `enquiry.json` | `never_run` |
| `health.json` | `never_run` |
| `newsletter.json` | `never_run` |
| `prompt-pack.json` | `never_run` |
| `repurpose.json` | `never_run` |
| `seo.json` | `never_run` |

Unique to this site: `prompt-pack`.

### Social Agent
- **Present:** ✓ (`social-agent.html` at root)
- **Research sources:** Trending AI video tools · Viral video formats & hooks · AI prompt techniques & guides · Gumroad product spotlights · Platform algorithm updates (off by default)
- **Pipeline logs reference:** aiviralvideoprompts.com content & Gumroad products
- **⚠ OOT contamination:** 21 hardcoded Old Oak Town references in AI system prompts — see Conflicts section. Critically: "Grow the Business Directory" campaign objective (OOT-specific feature) is baked into the AIVVP system prompts.

### Buffer
- **Connected:** ✓ (architecture wired via `/api/buffer-post`)

### Newsletter / Email List
- **Provider:** ✗ None connected — purely manual ("copy into your email platform")

### Revenue Data Source
- **Gumroad:** Referenced for health monitoring (admin checks for broken Gumroad links as "lost sales risk"), research sources include "Gumroad product spotlights", and Prompt Pack agent generates "Gumroad listing copy." However, **no Gumroad API sales data flows into admin** — revenue is invisible.
- **Stripe:** ✗ None

### Admin Hub (`admin/index.html`)

| Section | Panels |
|---|---|
| Overview | Dashboard (agent status, needs attention, quick actions) |
| Content | Curator, Newsletter, Repurpose, Social Agent (→ external link) |
| Products | Prompt Packs, Enquiries |
| Site | SEO Gaps, Site Health, View Site |

Health panel specifically monitors `brokenGumroadLinks` count and flags it as a revenue risk.

### CLAUDE.md
- **Present:** ✗ None

---

## 5. Old Oak Town (`oldoaktown`)

**Site:** oldoaktown.co.uk | **Platforms:** Facebook, Instagram, LinkedIn

### Agent Status
Old Oak Town uses a different architecture — there is no `data/agent-summaries/` directory. Agent scripts live in a separate repo (`oldoaktown-agents/`) and write output to `data/curator-digest/`, `data/review-queue/`, etc. The admin reads these directories directly.

Scripts in `oldoaktown-agents/`:
- `content-curator.js`
- `business-curator.js`
- `generate-digest.js`
- `seo-gap-finder.js`
- `site-health-monitor.js`

No JSON status files were found — run status is unknown without checking file timestamps or agent logs.

### Social Agent
- **Present:** ✓ (`social-agent.html` at root)
- **Research sources:** HS2 / OPDC news · Community events · Business spotlights · Planning applications · Transport & infrastructure
- **Additional data fetches:** `/data/ticker-news.json` and `/data/news.json` (local data files — only OOT social agent does this)
- **Campaign objectives:** Newsletter sign-ups (The Old Oak Weekly), Business Directory growth, Audience reach
- **This is the canonical source** — all other sites were generated from this template

### Buffer
- **Connected:** ✓ (architecture wired + `api/buffer-post.js` file exists on disk — most complete implementation)

### Newsletter / Email List
- **Provider:** Beehiiv — explicitly mentioned in admin ("copy and paste it into your Beehiiv or email platform"). Not directly API-connected; still manual copy-paste.

### Revenue Data Source
- **Stripe + Supabase:** ✓ — referenced in CLAUDE.md and admin UI shows "Est. Monthly Revenue" and "Revenue Breakdown" widget (Featured + Premium directory listing tiers). Admin actively reads revenue data from Supabase.
- **GitHub Actions:** Daily RSS aggregation at 8 AM UTC (`.github/workflows/`) — automated content pipeline, unlike other sites

### Admin Hub (`admin/index.html`)

| Section | Panels |
|---|---|
| Overview | Dashboard (agent status, needs attention, tools, revenue breakdown) |
| Tools | Social (→ link), Directory, Content Review, Videos |
| Agents | Content Curator, Newsletter, Biz Manager, SEO Gaps, Site Health |
| Site | View Site (external link) |

Revenue breakdown widget is unique to this site among all five.

### CLAUDE.md
- **Present:** ✓ — Comprehensive. Documents brand identity (colors, fonts, tone), full tech stack (Static HTML, Node.js, Supabase, Stripe, Vercel, Netlify, Buffer, GA4), project structure, content strategy (70/20/10 pillars), revenue model, social command centre operation, Buffer API env vars, and dev conventions.

---

## Conflicts & Gaps

### CONFLICT 1 — All four non-OOT social agents contain Old Oak Town system prompts (CRITICAL)

Every social-agent.html file generated from the Old Oak Town template retains 21 hardcoded references to `oldoaktown.co.uk`, "The Old Oak Weekly", "Old Oak Common", and "West London" **inside the AI system prompts for campaign objectives**.

| Site | OOT references in system prompts |
|---|---|
| Didi Anolue | 21 |
| Master Your Career Path | 21 |
| The Concurrent Contractor | 21 |
| AI Viral Video Prompts | 21 |

**Impact:** When any user on a non-OOT site selects the "Newsletter" campaign objective, Claude is instructed to drive sign-ups to *The Old Oak Weekly* at *oldoaktown.co.uk*. The "Grow the Business Directory" objective refers to an OOT-specific feature that doesn't exist on those sites. All CTAs, newsletter URLs, and audience descriptions are wrong.

---

### CONFLICT 2 — Email/newsletter provider undefined or disconnected on 4 of 5 sites

| Site | Provider mentioned | Actually connected |
|---|---|---|
| Didi Anolue | None (generic "Mailchimp, Beehiiv, etc.") | ✗ |
| Master Your Career Path | None (generic) | ✗ |
| The Concurrent Contractor | Constant Contact | ✗ (DEMO_MODE) |
| AI Viral Video Prompts | None (generic) | ✗ |
| Old Oak Town | Beehiiv | ✗ (manual copy-paste) |

Every site's newsletter workflow is manual. No site has an API-connected email pipeline.

---

### CONFLICT 3 — TCC payment integration missing from command-center page

`app/command-center/page.tsx` is a polished sales page with pricing (£97/mo, £932/yr) and a "Start Your 30-Day Trial" button. The button has no `href` and no payment processor integration — clicking it does nothing. No Stripe, LemonSqueezy, or Paddle is wired.

---

### CONFLICT 4 — TCC email capture still in DEMO_MODE

The CHAOS Assessment captures leads into `localStorage` only. `demo-dashboard/page.tsx` explicitly says "NOT sent to Constant Contact." Going live requires: OAuth token setup, 9 custom Constant Contact fields, a 7-day automation sequence, and flipping `DEMO_MODE=false`.

---

### CONFLICT 5 — Revenue data invisible for MYCP and AIVVP

MYCP earns via Skool (subscriptions, cohorts, courses) but the admin shows no Skool revenue data. AIVVP earns via Gumroad but admin only monitors broken links — no sales figures. Only OOT has live revenue data in admin (via Supabase + Stripe).

---

### CONFLICT 6 — Didi has a `social.json` agent with no equivalent on other sites

`social.json` exists in Didi's `data/agent-summaries/` (status: `never_run`, `scheduled: 0`) but no other site has this file. It is unclear what it tracks that differs from the social-agent.html tool — likely a scheduling/calendar view agent that was never built out.

---

### CONFLICT 7 — Old Oak Town uses a divergent agent architecture

All four other sites share the `data/agent-summaries/*.json` status-file pattern. Old Oak Town has no such directory — its agents are standalone Node.js scripts in a separate `oldoaktown-agents/` repo with no status reporting into the admin JSON format. This makes cross-site dashboard aggregation architecturally mismatched.

---

### CONFLICT 8 — Didi's `didianolue.json` site config has no `platforms` array

Every other site config JSON (`masteryourcareerpath.json`, `theconcurrentcontractor.json`, `aiviralvideoprompts.json`) defines a `platforms` array. `didianolue.json` has only `researchSources` — platforms (Facebook, Instagram, LinkedIn) are hardcoded directly in the HTML, bypassing the config system.

---

### GAP — No CLAUDE.md at root for Didi, TCC, or AIVVP

| Site | CLAUDE.md at root |
|---|---|
| Didi Anolue | ✗ (only in hyperframes/ subfolder) |
| Master Your Career Path | ✓ |
| The Concurrent Contractor | ✗ |
| AI Viral Video Prompts | ✗ |
| Old Oak Town | ✓ |

---

### GAP — Zero agents have ever been run across all sites

Every agent JSON across Didi, MYCP, TCC, and AIVVP shows `"status": "never_run"`. The admin dashboards exist and are styled, but no automated agent has ever executed — the pipeline is built but dark.
