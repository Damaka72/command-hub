# Old Oak Town admin integration

Command Hub surfaces what's waiting on oldoaktown.co.uk's own admin dashboard
(a separate site/repo — `Damaka72/oldoaktown`) and drafts (and optionally
auto-publishes) a spotlight for newly-approved businesses.

## What was added

- **Notifications** — pending businesses and pending events from Old Oak
  Town's admin dashboard show up in two places:
  - The "Old Oak Town Admin" panel on the main dashboard
    (`app/components/OldOakTownAdmin.tsx`), with a link straight to
    `oldoaktown.co.uk/admin/dashboard.html`.
  - "Today's Focus" in the left sidebar (`DailyBriefing`), so a pending
    approval shows up the moment you open the Hub.
- **Promotion** — a spotlight post (Instagram, Facebook, LinkedIn) is drafted
  for every approved business that hasn't been promoted yet, either:
  - **Automatically**, the moment it's approved on oldoaktown.co.uk — a
    webhook call from oldoaktown's `api/approve.js` hits
    `POST /api/oldoaktown/webhook` in this app, or
  - **On demand**, via the "Promote new businesses" button in the panel
    (`POST /api/oldoaktown/promote`) — useful for catching up on anything
    approved before the webhook was wired up, or for a manual re-run.
  Both call the same logic in `app/lib/oldoaktown-promote.ts`.
- Drafts land in the normal **Review Queue** (`/review`). Because the same
  `content_library` row also feeds `/api/newsletters/draft` for **The Oak**,
  approving a spotlight there and regenerating that week's newsletter draft
  pulls it into the newsletter too.
- **Auto-publish (opt-in)** — with `OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS=true`
  set, the Facebook and LinkedIn captions push straight to Blotato (~5
  minutes out) with no review step. Instagram *never* auto-publishes — it
  needs an attached image (Blotato won't post without one) and nothing here
  generates one, so it always waits in the Review Queue for a human to
  attach media and push. **This flag defaults off.** Without it, every
  platform — including Facebook/LinkedIn — lands in the Review Queue exactly
  as before, and a human approves + pushes as normal.
- A `oldoaktown_business_promotions` table (migration
  `20260807120000_oldoaktown_business_promotions.sql`) tracks which
  businesses have already been drafted, so re-running promotion (button or
  webhook) never duplicates a spotlight.

The weekly content pipeline itself still never runs on a schedule
(`.github/workflows/weekly-pipeline.yml` is manual-only, deliberately) — this
integration doesn't change that. What changed is scoped to Old Oak Town
business spotlights only, and the auto-publish half of it is opt-in.

## How the data is read

- **Businesses** (pending + approved) are read directly from oldoaktown's
  Supabase project via its public anon key — the same key oldoaktown's own
  admin dashboard already uses client-side, and its RLS policy already
  allows the anon key to read every listing regardless of status
  (`supabase/migrations/002_admin_dashboard_rls.sql` in the oldoaktown repo).
  This is read-only; nothing here can approve, reject, or edit a listing.
- **Events** have no equivalent open policy, so they're read via oldoaktown's
  own `/api/approve-event` endpoint, which requires its `ADMIN_PASSWORD`.

## Environment variables to set

### Command Hub (Vercel → command-hub project)

| Variable | Required | Purpose |
|---|---|---|
| `OLDOAKTOWN_ADMIN_PASSWORD` | Yes, for events | Same value as `ADMIN_PASSWORD` on the oldoaktown Vercel project. Without it, pending events show as unavailable (not zero) rather than silently reporting none. |
| `OLDOAKTOWN_WEBHOOK_SECRET` | Yes, for the real-time trigger | A secret you generate (e.g. `openssl rand -hex 32`). Must match `COMMAND_HUB_WEBHOOK_SECRET` on the **oldoaktown** project. Without it, `/api/oldoaktown/webhook` returns 503 and does nothing — the "Promote new businesses" button still works. |
| `OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS` | No — opt-in | Set to `true` to auto-push Facebook/LinkedIn spotlights to Blotato with no review step. Leave unset to keep everything review-gated (recommended until you've seen a few spotlights come through and are happy with the tone). |
| `OLDOAKTOWN_SUPABASE_URL` | No | Overrides the oldoaktown Supabase project URL if it's ever rotated. Defaults to the current project. |
| `OLDOAKTOWN_SUPABASE_ANON_KEY` | No | Overrides the anon key if it's ever rotated. Defaults to the current public anon key (the same one already shipped in oldoaktown's admin dashboard HTML). |

`ANTHROPIC_API_KEY`, `BLOTATO_API_KEY`, and the existing
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Command Hub's
own Supabase project, for `content_library` and the new promotions table)
must already be set — promotion reuses them.

### oldoaktown (Vercel → oldoaktown project)

| Variable | Required | Purpose |
|---|---|---|
| `COMMAND_HUB_WEBHOOK_URL` | Yes, for the real-time trigger | `https://<your-command-hub-domain>/api/oldoaktown/webhook` |
| `COMMAND_HUB_WEBHOOK_SECRET` | Yes, for the real-time trigger | Same value as `OLDOAKTOWN_WEBHOOK_SECRET` above. |

If either is unset, `api/approve.js` skips the webhook call silently (logged,
not thrown) — approvals keep working exactly as before, they just don't
trigger a spotlight until someone clicks "Promote new businesses".

## Rollout order

1. Deploy the command-hub changes (this branch) — the webhook route exists
   but returns 503 until `OLDOAKTOWN_WEBHOOK_SECRET` is set, so this is safe
   to ship first.
2. Apply the new Supabase migration
   (`20260807120000_oldoaktown_business_promotions.sql`) to Command Hub's
   Supabase project.
3. Set `OLDOAKTOWN_WEBHOOK_SECRET` on Command Hub, and the matching
   `COMMAND_HUB_WEBHOOK_URL` / `COMMAND_HUB_WEBHOOK_SECRET` pair on
   oldoaktown, then deploy the oldoaktown change.
4. Approve a test business and confirm a draft appears in `/review` within a
   few seconds.
5. Only once you're happy with the spotlight quality, set
   `OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS=true` to let Facebook/LinkedIn go out
   without review.
