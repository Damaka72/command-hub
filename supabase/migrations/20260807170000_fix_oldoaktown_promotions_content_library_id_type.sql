-- ── Fix oldoaktown_business_promotions.content_library_id type ──────────────
-- The original migration (20260807120000) declared this column `bigint`,
-- guessing content_library used a bigint identity id like research_briefs and
-- weekly_plan do. It doesn't — content_library.id is `uuid`. Every insert into
-- oldoaktown_business_promotions was silently failing as a result (the code
-- didn't check that insert's error — now fixed in
-- app/lib/oldoaktown-promote.ts), so dedup never actually recorded and
-- repeat "Promote new businesses" runs kept re-drafting the same approved
-- businesses. This corrects the column type; any rows already promoted before
-- this fix need a one-off manual backfill (done directly via Supabase for the
-- businesses affected — see conversation history, not scripted here since the
-- affected set is a fixed, already-known list, not a repeatable migration step).

alter table public.oldoaktown_business_promotions
  alter column content_library_id type uuid using content_library_id::text::uuid;
