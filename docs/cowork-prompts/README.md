# Cowork task prompts

Ready to paste into Cowork. Each `.txt` file is the whole prompt for one scheduled task, with the shared
rules already included. Create each task in Cowork (the claude.ai routines screen) and attach the connectors
shown. Times are Europe/London, spaced a few minutes off the hour on purpose.

| Task | File | Schedule (cron) | Connectors to attach | Status |
|---|---|---|---|---|
| Weekend content brief and drafts | `weekly-drafts.txt` | `CRON_TZ=Europe/London 55 6 * * 6` | already attached | **Applied** on 9 Nov 2026 |
| Monthly base posts | `monthly-base-posts.txt` | `CRON_TZ=Europe/London 13 5 * * 6` (works only on the last Saturday of the month) | Supabase, Blotato, Google Drive | To create |
| Wednesday news check | `wednesday-news-check.txt` | `CRON_TZ=Europe/London 41 6 * * 3` | Supabase, Blotato | To create |
| Schedule approved posts (Sunday) | `schedule-approved-posts.txt` | `CRON_TZ=Europe/London 38 18 * * 0` | Supabase, Blotato | To create |
| Schedule approved posts (Monday) | same file | `CRON_TZ=Europe/London 8 5 * * 1` | Supabase, Blotato | To create |
| Schedule approved posts (Wednesday) | same file | `CRON_TZ=Europe/London 8 10 * * 3` | Supabase, Blotato | To create |
| Media desk | `media-desk.txt` | `CRON_TZ=Europe/London 20 7 * * *` | Supabase, Blotato, Google Drive | To create |

The Saturday weekly run reads the base posts the monthly run writes, so the monthly run is set earlier on
Saturday. Why each task is built this way is in `docs/cowork-operating-guide.md`.
