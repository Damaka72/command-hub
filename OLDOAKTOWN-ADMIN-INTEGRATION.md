# Old Oak Town admin integration

Command Hub now surfaces what's waiting on oldoaktown.co.uk's own admin
dashboard (a separate site/repo — `Damaka72/oldoaktown`) and can draft a
social + newsletter spotlight for newly-approved businesses.

## What was added

- **Notifications** — pending businesses and pending events from Old Oak
  Town's admin dashboard show up in two places:
  - The "Old Oak Town Admin" panel on the main dashboard
    (`app/components/OldOakTownAdmin.tsx`), with a link straight to
    `oldoaktown.co.uk/admin/dashboard.html`.
  - "Today's Focus" in the left sidebar (`DailyBriefing`), so a pending
    approval shows up the moment you open the Hub.
- **Promotion** — click "Promote new businesses" (in the same panel) to draft
  a Business Spotlight post (Instagram, Facebook, LinkedIn) for every
  approved business that hasn't been promoted yet. Drafts land in the normal
  **Review Queue** (`/review`) exactly like the weekly content pipeline's
  output — nothing publishes automatically. Because the same
  `content_library` row also feeds `/api/newsletters/draft` for **The Oak**,
  approving a spotlight there and regenerating that week's newsletter draft
  pulls it into the newsletter too. One review step covers both channels.
- A `oldoaktown_business_promotions` table (new migration) tracks which
  businesses have already been drafted, so re-running the promote step never
  duplicates a spotlight.

This is deliberately **manual-trigger, review-first** — consistent with this
repo's existing rule that the content pipeline never runs on a schedule
(see `.github/workflows/weekly-pipeline.yml`). Nothing posts to Old Oak
Town's social accounts or subscribers without a human approving it first.

## How the data is read

- **Businesses** (pending + approved) are read directly from oldoaktown's
  Supabase project via its public anon key — the same key oldoaktown's own
  admin dashboard already uses client-side, and its RLS policy already
  allows the anon key to read every listing regardless of status
  (`supabase/migrations/002_admin_dashboard_rls.sql` in the oldoaktown repo).
  This is read-only; nothing here can approve, reject, or edit a listing.
- **Events** have no equivalent open policy, so they're read via oldoaktown's
  own `/api/approve-event` endpoint, which requires its `ADMIN_PASSWORD`.

## Environment variables to set (Vercel → Command Hub project)

| Variable | Required | Purpose |
|---|---|---|
| `OLDOAKTOWN_ADMIN_PASSWORD` | Yes, for events | Same value as `ADMIN_PASSWORD` on the oldoaktown Vercel project. Without it, pending events show as unavailable (not zero) rather than silently reporting none. |
| `OLDOAKTOWN_SUPABASE_URL` | No | Overrides the oldoaktown Supabase project URL if it's ever rotated. Defaults to the current project. |
| `OLDOAKTOWN_SUPABASE_ANON_KEY` | No | Overrides the anon key if it's ever rotated. Defaults to the current public anon key (the same one already shipped in oldoaktown's admin dashboard HTML). |

`ANTHROPIC_API_KEY` and the existing `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (Command Hub's own Supabase project, for
`content_library` and the new promotions table) must already be set — the
promote step reuses them.

## Not built (needs a decision if you want it)

- **Real-time trigger.** This integration polls Old Oak Town's data; it does
  not add a webhook that fires the instant a business is approved, because
  that would require changes to the `oldoaktown` repo, which is out of scope
  for this change (only `command-hub` was touched). If you want approvals to
  trigger a draft immediately, say so and we can add a small webhook call
  from oldoaktown's `api/approve.js` to a new Command Hub endpoint.
- **Auto-send.** The spotlight still needs a human approval in `/review` (and
  a newsletter regenerate) before it reaches anyone. If you'd rather it post
  automatically, that's a one-line change to skip the review gate — not
  recommended, but straightforward if you want it.
