# The Concurrent Contractor — archived

**What it was:** a managed site in the hub (theconcurrentcontractor.com): IR35 and contracting resources for experienced UK IT contractors. It ran in the content pipeline (LinkedIn, Instagram, Facebook), had its own content pillars and grader rubric, and fed "The Consultant" section of the Pathway newsletter.

**Retired:** 5 November 2026, on branch `claude/hub-restyle`. Didi no longer manages the site. **World of Contracts** (worldofcontracts.co.uk) takes its place in the hub.

**Last commit that still had it live in the hub:** `a901dfc` on `main`. To bring any file back exactly as it was: `git show a901dfc:<path>`.

## What is in this folder

| File | What it holds |
| --- | --- |
| `removed-configuration.md` | Every block taken out of the code and data files, verbatim, with the file it came from. |
| `content-pillars.json` | The six content pillars. |
| `weekly-plan-entry.json` | The site's entry in the fallback weekly plan. |
| `coordinator-status-entry.json` | The site's entry in the coordinator status file. |

## What was deliberately NOT touched

- **Database:** no tables, rows or migrations were dropped or changed. Existing `content_library`, `actions_log`, `weekly_plan` and review-queue rows for `theconcurrentcontractor` remain in Supabase; the hub just no longer shows or creates them. The `actions_log` migration still lists the old site id in its check constraint, which is harmless.
- **The live site, its repository and its Vercel project:** nothing was changed there.
- **Historical documents** (`SITE-AUDIT.md`, the May 2026 `COWORK.md`, `IMPLEMENTATION.md`, `AGENT-IMPLEMENTATION.md`): moved to `archive/legacy-docs/` as a record of how things stood. `REPURPOSING-RECIPES.md` and `WORKSHOP-MIGRATION.md` stay at the repo root. They mention the site by name; none is read by the app.

## To restore it

1. Put each block in `removed-configuration.md` back in the file it names.
2. Put `content-pillars.json`, `weekly-plan-entry.json` and `coordinator-status-entry.json` back into the matching files in `data/`.
3. Add `'theconcurrentcontractor'` back to the site lists (the review, plan, library, friday pages, the status route and the Blotato route each hold a list or label map).
