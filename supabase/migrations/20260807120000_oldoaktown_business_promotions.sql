-- ── oldoaktown_business_promotions ────────────────────────────────────────────
-- Tracks which Old Oak Town businesses (from the separate oldoaktown Supabase
-- project — see app/lib/oldoaktown.ts) have already had a spotlight post
-- generated, so POST /api/oldoaktown/promote never drafts the same business
-- twice. `business_id` is oldoaktown's own businesses.id (a uuid from a
-- different project) — stored as text since it is not a local foreign key.
-- `content_library_id` is informational only (no FK — content_library lives
-- in this project but its id type predates the migrations folder).

create table if not exists public.oldoaktown_business_promotions (
  business_id        text primary key,
  business_name      text not null,
  promoted_at        timestamptz not null default now(),
  content_library_id bigint
);
