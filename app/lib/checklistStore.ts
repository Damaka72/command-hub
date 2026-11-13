// ── Launch checklist — server-side store ────────────────────────────────────
// Items live in data/checklists/<siteId>.json (committed; adding a site's checklist is adding a
// file). Changes made in the Hub are saved in the Supabase table `checklist_item_state` and laid
// over the file, exactly like the work trackers (see trackerStore.ts). If that table is missing or
// Supabase is unreachable, reads still work from the file and `persistence` says 'unavailable' so
// the page can be honest that changes are kept on this device only.

import fs from 'node:fs';
import path from 'node:path';
import { getSupabase } from './supabase';
import { isChecklistStatus, parseChecklistFile, type ChecklistFile, type ChecklistStatus } from './checklistLogic';

const DIR = path.join(process.cwd(), 'data', 'checklists');
const TABLE = 'checklist_item_state';

export type Persistence = 'saved' | 'unavailable';

export function loadAllChecklistFiles(): ChecklistFile[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => parseChecklistFile(JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8')), f));
}

export const loadChecklistFile = (siteId: string) => loadAllChecklistFiles().find(c => c.siteId === siteId) ?? null;

interface Row { site_id: string; item_id: string; status: string; blocked_reason: string | null; notes: string | null; secrets_set: string[] | null; updated_at: string }

async function overrides(siteIds: string[]): Promise<{ rows: Map<string, Row>; ok: boolean }> {
  const rows = new Map<string, Row>();
  try {
    const { data, error } = await getSupabase().from(TABLE).select('*').in('site_id', siteIds);
    if (error) return { rows, ok: false };
    for (const r of (data ?? []) as Row[]) if (isChecklistStatus(r.status)) rows.set(`${r.site_id}/${r.item_id}`, r);
    return { rows, ok: true };
  } catch {
    return { rows, ok: false };
  }
}

function apply(file: ChecklistFile, rows: Map<string, Row>): ChecklistFile {
  return {
    ...file,
    items: file.items.map(i => {
      const r = rows.get(`${file.siteId}/${i.id}`);
      if (!r) return i;
      return {
        ...i,
        status: r.status as ChecklistStatus,
        blocked_reason: r.status === 'blocked' ? (r.blocked_reason ?? i.blocked_reason ?? undefined) : undefined,
        notes: r.notes ?? i.notes,
        secrets_set: r.secrets_set ?? i.secrets_set,
        updated_at: r.updated_at,
      };
    }),
  };
}

export async function loadChecklist(siteId: string): Promise<{ file: ChecklistFile; persistence: Persistence } | null> {
  const file = loadChecklistFile(siteId);
  if (!file) return null;
  const { rows, ok } = await overrides([siteId]);
  return { file: apply(file, rows), persistence: ok ? 'saved' : 'unavailable' };
}

export async function loadAllChecklists(): Promise<{ files: ChecklistFile[]; persistence: Persistence }> {
  const files = loadAllChecklistFiles();
  if (!files.length) return { files, persistence: 'saved' };
  const { rows, ok } = await overrides(files.map(f => f.siteId));
  return { files: files.map(f => apply(f, rows)), persistence: ok ? 'saved' : 'unavailable' };
}

export async function saveChecklistItem(siteId: string, itemId: string, v: { status: ChecklistStatus; blocked_reason: string | null; notes: string | null; secrets_set: string[] }): Promise<boolean> {
  try {
    const { error } = await getSupabase().from(TABLE).upsert({ site_id: siteId, item_id: itemId, ...v, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}
