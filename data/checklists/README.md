# Launch setup checklists

One JSON file per site, in `data/checklists/<siteId>.json`. Add a file and the site gets a setup
checklist at `/checklists/<siteId>` and a progress line on its card on the home page. No code changes.

Each item has `id`, `phase`, `title`, `owner` (`didi`, `claude_code` or `either`), `status`
(`todo`, `in_progress`, `done`, `blocked`, `not_needed`), `blocked_reason` (when blocked),
`instructions` (two or three plain sentences), `link`, `depends_on` (item ids), `notes`,
`updated_at`, and optionally `secret_names` (environment variable names, to mark set / not set)
and `auto_check` (a key from `AUTO_CHECKS` in `app/lib/checklistLogic.ts`).

- The **Next action** is the first item that is not done and whose dependencies are done.
- **No secrets, ever.** Only whether something is set (yes or no) is recorded. The file loader and the
  save action both refuse text that looks like a key or password.
- The committed `status` is the starting point. Changes made on screen are stored in Supabase
  (`checklist_item_state`, see `supabase/migrations/20261113120000_checklist_item_state.sql`) and laid
  over the file. If that table is missing, changes are kept on that device only and the page says so.
  You can also edit the file in GitHub's web editor.
- Run the tests with `npm test`.
