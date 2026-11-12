# Command Hub home page: data

The home page (`/`) is a morning paper: Faith, Health check, Today, Overnight, Insights.
Its content comes from the files here and a few API routes. The old operations dashboard
(revenue, deploys, trackers, per-site panels) lives at `/ops`.

## Files

| File | What it holds | Shown in |
|---|---|---|
| `sites.json` | The five sites: URL, Vercel project, GitHub repo, notes | Health check |
| `projects.json` | Projects: client, type, status, next action, linked site, deadline, priority | Health check, Today, Insights |
| `insights.json` | Hand-written "Didi, have you thought about…" prompts (three rotate in daily) | Insights |

Files are validated on load; a mistake fails the build with the file and item named.

### Add a site
Add an entry to `sites.json` (`id`, `name`, `short`, `url`, `vercelProject`, `repo`).
Add `vercelProjectId` if you have it (more reliable than the name).

### Add or update a project
Edit `projects.json`. `status` is `live | active | completed | on_hold`, or `null` if not
yet confirmed. `priority` is `high | medium | low` or `null`. `deadline` is
`{ "date": "YYYY-MM-DD", "label": "Christmas 2026" }` or `null`. `site` is a site `id` or `null`.
A project with a `nextAction` appears in Today; a deadline within 14 days is pulled to the top.
Anything left `null` shows as "to confirm" / "not set" and prompts an insight.

### Add an insight prompt
Add to `insights.json`: `kind` is `think | discuss | advice`; `withWhom` is optional.

### Add a section to the page
Build a component in `app/components/hub/` that loads its own data, then add it to
`SECTIONS` in `app/page.tsx` (and to `JUMP` in `FaithHeader.tsx` for a jump link).

## What is editable on the page, and where it is stored
Word for Today, today's Bible reading, prayer points and the fast focus are edited in
place. They save to Supabase table `hub_settings` (key `faith`) through `/api/hub/faith`,
so they follow Didi across devices. The migration is
`supabase/migrations/20261106120000_hub_settings.sql` and **must be applied** first; until
then edits are kept in the browser and the page says "Saved on this device only".

## Environment
- `VERCEL_TOKEN`: shows each site's last production deploy (same token `/api/status` uses).
  Without it the Health check still reports live/down but says deploy info is off.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: already used elsewhere.

## Placeholders
`/api/hub/overnight` returns the (empty) shape the Overnight section renders. Wire up Gmail
and a news source there; the section needs no change.

## Bible in a Year
The default is a straight-through plan (Genesis to Revelation, 1,189 chapters across the
year). Didi can type over today's reading on the page. To follow a specific plan by default,
replace `readingFor` in `app/lib/hub/bible.ts`.
