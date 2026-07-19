-- Migration: content_library_media_urls
-- Version:  20260719120000
--
-- Adds media_urls to content_library: an array of publicly accessible image /
-- video URLs attached to a post in the review queue before it is pushed to
-- Blotato. Blotato's v2 posts API takes public URLs directly in content.mediaUrls
-- (no pre-upload step), so the review UI can capture URLs per post and the push
-- route forwards them.
--
-- Applied to the live Supabase project, then recorded here (matching the repo's
-- existing migration convention). Written idempotently (ADD COLUMN IF NOT EXISTS
-- with a default) so it is safe to keep as a record and will not re-alter the
-- live schema.

alter table public.content_library
  add column if not exists media_urls jsonb not null default '[]'::jsonb;
