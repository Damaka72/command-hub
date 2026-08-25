-- Migration: phase6_newsletter_drive_link
-- Version:  20260825210324
--
-- This migration was applied directly to the live Supabase project and is
-- recorded here so the repo has a record of the schema. It is written
-- idempotently (ADD COLUMN IF NOT EXISTS) so it is safe to keep as a record
-- and will not re-apply or alter the live schema.

-- ── newsletters.drive_link ───────────────────────────────────────────────────
-- Newsletters can be drafted directly in a Google Doc rather than in the
-- Hub's own textarea — this column holds a link to that doc so the Hub can
-- display/store it per (publication, week) alongside the existing
-- draft_content/edited_content in-app draft, without replacing it. Feeds the
-- Draft Queue panel on /newsletters, which lists upcoming weeks so drafts can
-- be queued ahead of time by linking to a Doc before the week's content is
-- otherwise ready.
alter table public.newsletters
  add column if not exists drive_link text;
