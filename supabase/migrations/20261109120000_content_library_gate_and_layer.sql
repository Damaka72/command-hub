-- Migration: content_library_gate_and_layer
-- Version:  20261109120000
--
-- Supports the Sunday review view (docs/social-team-design.md).
--
--   layer           which posting layer a post belongs to:
--                     base  = evergreen standing posts (monthly run)
--                     focus = the weekly posts Didi puts attention on
--                     flex  = the Wednesday-pulse reactive slot
--   gate_verdict    the Brand gate's result, written by Cowork after drafting:
--                     ready   = no rule hit, facts traceable, safe to approve in one action
--                     flagged = a possible problem; Didi decides
--                     blocked = a hard-rule breach; fix before it can be approved
--   gate_reason     one plain sentence saying why (shown on the card)
--   gate_checked_at when the gate last looked at this row
--
-- All four are nullable. A row with no gate_verdict is shown as "not yet checked"
-- and is never offered for one-action approval.
--
-- Written idempotently (guarded ADDs) so it is safe to re-run and to keep as a
-- repo record. The hub reads content_library with select('*'), so it keeps
-- working before this is applied; it simply shows every row as "not yet checked".

alter table public.content_library
  add column if not exists layer           text,
  add column if not exists gate_verdict    text,
  add column if not exists gate_reason     text,
  add column if not exists gate_checked_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_library_layer_check') then
    alter table public.content_library
      add constraint content_library_layer_check
      check (layer is null or layer = any (array['base', 'focus', 'flex']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'content_library_gate_verdict_check') then
    alter table public.content_library
      add constraint content_library_gate_verdict_check
      check (gate_verdict is null or gate_verdict = any (array['ready', 'flagged', 'blocked']));
  end if;
end $$;

-- Sunday view lookup: a week's rows by gate verdict.
create index if not exists content_library_week_gate_idx
  on public.content_library using btree (week_commencing, gate_verdict);
