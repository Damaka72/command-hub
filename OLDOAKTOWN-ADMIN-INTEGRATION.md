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

- **Turns out oldoaktown and Command Hub share one Supabase project**
  ("The Old Oak Town", `mvttihozhozigtrwqsyy`) — `businesses`/`events` and
  `content_library`/`weekly_plan`/etc. are all tables in the same database.
  `app/lib/oldoaktown.ts` still reads businesses over plain REST with the
  public anon key (the same key oldoaktown's own admin dashboard already
  uses client-side, opened to all statuses by
  `supabase/migrations/002_admin_dashboard_rls.sql` in the oldoaktown repo)
  rather than the app's shared Supabase client — that was written before we
  confirmed it's the same project, so it's a harmless extra client hitting
  the same DB, not a bug. `OLDOAKTOWN_SUPABASE_URL` /
  `OLDOAKTOWN_SUPABASE_ANON_KEY` exist as overrides but don't need setting —
  the hardcoded defaults already point at the right project. This path is
  read-only; nothing here can approve, reject, or edit a listing.
- **Events** have no open RLS policy, so they're read via oldoaktown's own
  `/api/approve-event` endpoint, which requires its `ADMIN_PASSWORD`.
- `oldoaktown_business_promotions` (new table, migration
  `20260807120000_oldoaktown_business_promotions.sql`) has been created in
  that same project with RLS enabled and anon read/insert/update policies,
  matching every other Command Hub table there.

## Environment variables to set

### Command Hub (Vercel → command-hub project)

| Variable | Required | Purpose |
|---|---|---|
| `OLDOAKTOWN_ADMIN_PASSWORD` | Yes, for events | Same value as `ADMIN_PASSWORD` on the oldoaktown Vercel project. Without it, pending events show as unavailable (not zero) rather than silently reporting none. |
| `OLDOAKTOWN_WEBHOOK_SECRET` | Yes, for the real-time trigger | A secret you generate (e.g. `openssl rand -hex 32`). Must match `COMMAND_HUB_WEBHOOK_SECRET` on the **oldoaktown** project. Without it, `/api/oldoaktown/webhook` returns 503 and does nothing — the "Promote new businesses" button still works. |
| `OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS` | No — opt-in | Set to `true` to auto-push Facebook/LinkedIn spotlights to Blotato with no review step. Leave unset to keep everything review-gated (recommended until you've seen a few spotlights come through and are happy with the tone). |

`ANTHROPIC_API_KEY`, `BLOTATO_API_KEY`, and the existing
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` must already be
set — promotion reuses them.

### oldoaktown (Vercel → oldoaktown project)

| Variable | Required | Purpose |
|---|---|---|
| `COMMAND_HUB_WEBHOOK_URL` | Yes, for the real-time trigger | `https://<your-command-hub-domain>/api/oldoaktown/webhook` |
| `COMMAND_HUB_WEBHOOK_SECRET` | Yes, for the real-time trigger | Same value as `OLDOAKTOWN_WEBHOOK_SECRET` above. |

If either is unset, `api/approve.js` skips the webhook call silently (logged,
not thrown) — approvals keep working exactly as before, they just don't
trigger a spotlight until someone clicks "Promote new businesses".

## Rollout order

1. ~~Deploy the command-hub changes.~~ Done — [PR #63](https://github.com/Damaka72/command-hub/pull/63) merged.
2. ~~Deploy the oldoaktown webhook-notify change.~~ Done — [PR #343](https://github.com/Damaka72/oldoaktown/pull/343) merged.
3. ~~Apply the new Supabase migration.~~ Done — `oldoaktown_business_promotions`
   exists with RLS enabled.
4. **Set `OLDOAKTOWN_WEBHOOK_SECRET` on Command Hub** (Vercel → command-hub
   → Settings → Environment Variables), and the matching
   `COMMAND_HUB_WEBHOOK_URL` / `COMMAND_HUB_WEBHOOK_SECRET` pair on
   oldoaktown. **This is the only step left** — the webhook 503s until it's
   set.
5. Approve a test business on oldoaktown.co.uk and confirm a draft appears
   in Command Hub's `/review` within a few seconds.
6. Only once you're happy with the spotlight quality, set
   `OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS=true` to let Facebook/LinkedIn go out
   without review.
