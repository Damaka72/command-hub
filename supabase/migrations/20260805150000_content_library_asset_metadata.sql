-- Migration: content_library_asset_metadata
-- Version:  20260805150000
--
-- Phase 1 of the unified content-creation scope: lets a content_library row
-- describe the ASSET behind it (not just text + a bare media URL), and lets a
-- human flag "please create this" without inventing a new status value.
--
-- creation_requested_at is layered on top of the existing approved_needs_media
-- status rather than adding a new status: a media-required row already means
-- "needs media"; this column only distinguishes "flagged for creation" from
-- "nobody has asked yet" so a batch run has a precise worklist to poll.
--
-- Written idempotently (guarded ADDs) so it is safe to keep as a repo record.

alter table public.content_library
  add column if not exists asset_type          text,
  add column if not exists creation_tool        text,
  add column if not exists drive_file_id        text,
  add column if not exists asset_duration_s     numeric,
  add column if not exists aspect_ratio         text,
  add column if not exists creation_requested_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_library_asset_type_check') then
    alter table public.content_library
      add constraint content_library_asset_type_check
      check (asset_type is null or asset_type = any (array['text', 'image', 'carousel', 'video']));
  end if;
end $$;

-- Worklist lookup: rows flagged for creation that don't have media attached yet.
create index if not exists content_library_creation_requested_idx
  on public.content_library using btree (creation_requested_at)
  where creation_requested_at is not null;
