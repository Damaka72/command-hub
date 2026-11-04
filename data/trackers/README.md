# Site work trackers

One JSON file per site. Add a file here and the site appears on the Hub home page
roll-up and at `/trackers/<siteId>` — no code changes.

```json
{
  "siteId": "my-site",            // lower-case, numbers, hyphens; also the URL
  "name": "My Site",
  "description": "One line (optional)",
  "url": "example.com",           // optional
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
  so the committed `status` is the starting point. Until that migration is applied,
  changes are kept in the browser only and the page says so.
