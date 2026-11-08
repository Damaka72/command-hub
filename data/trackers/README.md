# Site work trackers

One JSON file per site. Add a file here and the site appears on the Hub home page
(summary band, "Your next steps" panel and a site card) and at `/trackers/<siteId>`
— no code changes.

## How to add a new site

1. **The work list (all you need to get a card and a tracker page).** Copy
   `world-of-contracts.json` to `data/trackers/<siteId>.json`, change `siteId`,
   `name`, `description`, `url`, `repo` and `accent`, and replace the tasks. Check
   the file with `npm run build` (a mistake gives an error naming the file and task).
2. **Make it a managed site (live address, site list, identity colour).** Only
   needed if you want the Hub to check the site is up and to give it a
   permanent colour:
   - `app/lib/sites.ts`: add an entry whose `id` is the same as the tracker's `siteId`.
   - `app/lib/siteColors.ts`: add a `make(...)` line for that id.
   - `app/globals.css`: add `--site-<siteId>: #rrggbb;` next to the other `--site-*`
     colours (the only place a site colour is written down).
   - `app/api/status/route.ts`: add the site to `SITES` (use `vercelProjectId: null`
     if you do not have the Vercel project id).
   A site that is in the site list but has no tracker file still gets a card on the
   home page, saying "No tracker yet".
3. A site that runs in the weekly content pipeline also needs entries in
   `agents/site-configs.ts` and `agents/accounts.ts`; that is separate from trackers.

To retire a site, move its entries to `archive/<site>/` with a short README (see
`archive/the-concurrent-contractor/`); never drop its database rows.

```json
{
  "siteId": "my-site",            // lower-case, numbers, hyphens; also the URL
  "name": "My Site",
  "description": "One line (optional)",
  "url": "https://www.example.com", // optional; with or without https://
  "repo": "owner/repo",           // optional
  "accent": "#E9C46A",            // optional identity dot colour
  "tasks": [
    {
      "id": "web-badge",          // unique within the file; keep it stable
      "area": "On the website",   // tasks are grouped by this; areas follow `order`
      "title": "Badge built",
      "detail": "Optional short note",
      "status": "todo",           // todo | in_progress | done | parked
      "owner": "didi",            // didi | claude | both
      "next": false,              // true = shows in "Your next steps" until done
      "when": "Optional text, e.g. Before launch",
      "order": 10
    }
  ]
}
```

- `parked` means deliberately not started yet. Parked tasks still count in the total.
- The file is validated on load; a mistake gives an error naming the file and task.
- Status changes made in the Hub are stored in Supabase (`tracker_task_state`, see
  `supabase/migrations/20261103120000_tracker_task_state.sql`) and laid over the file,
  so the committed `status` is the starting point. If the table cannot be reached,
  changes are kept in the browser only and the page says so.
