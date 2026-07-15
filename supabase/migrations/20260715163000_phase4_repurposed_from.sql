-- Migration: phase4_repurposed_from
-- Version:  20260715163000
--
-- Adds a self-referencing link so content_library rows created by the Library
-- "Repurpose" action are traceable back to the row they were copied from. Unlike
-- the other phase4 migration, this one was NOT pre-applied — it is applied as part
-- of phase 4. Written idempotently (guarded ADDs) so keeping it as a repo record
-- is safe and re-running is a no-op.

-- ── content_library.repurposed_from_id — repurpose provenance ────────────────
-- Nullable uuid pointing at the source content_library row (same table). Null for
-- original rows; set to the source id for repurposed copies. ON DELETE SET NULL so
-- deleting a source keeps its repurposed copies (they just lose the back-link).
alter table public.content_library
  add column if not exists repurposed_from_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_library_repurposed_from_id_fkey') then
    alter table public.content_library
      add constraint content_library_repurposed_from_id_fkey
      foreign key (repurposed_from_id) references public.content_library(id) on delete set null;
  end if;
end $$;

-- Lookup index: find a source row's repurposed descendants.
create index if not exists content_library_repurposed_from_id_idx
  on public.content_library using btree (repurposed_from_id);
