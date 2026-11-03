// ── Site work tracker — server-side store ───────────────────────────────────
// Task lists live in data/trackers/<siteId>.json (committed to the repo — adding
// a site is adding a file). Status changes made in the Hub are saved in the
// Supabase table `tracker_task_state` and laid over the file, so moving a task
// on never rewrites the committed list.
//
// If that table is missing or Supabase is unreachable, reads still work (from
// the file) and `persistence` says 'unavailable' so the UI can be honest.

import fs from 'node:fs';
import path from 'node:path';
import { getSupabase } from './supabase';
import { isStatus, parseTrackerSite, type TaskStatus, type TrackerSite } from './trackerLogic';

const DIR = path.join(process.cwd(), 'data', 'trackers');
const TABLE = 'tracker_task_state';

export type Persistence = 'saved' | 'unavailable';

export interface TrackerWithState {
  site:        TrackerSite;
  persistence: Persistence;
}

/** Every committed tracker file, validated, in file-name order. */
export function loadAllTrackerFiles(): TrackerSite[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => parseTrackerSite(JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8')), f));
}

export function loadTrackerFile(siteId: string): TrackerSite | null {
  return loadAllTrackerFiles().find(s => s.siteId === siteId) ?? null;
}

async function loadOverrides(siteIds: string[]): Promise<{ rows: Map<string, TaskStatus>; ok: boolean }> {
  const rows = new Map<string, TaskStatus>();
  try {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select('site_id, task_id, status')
      .in('site_id', siteIds);
    if (error) return { rows, ok: false };
    for (const r of (data ?? []) as { site_id: string; task_id: string; status: string }[]) {
      if (isStatus(r.status)) rows.set(`${r.site_id}/${r.task_id}`, r.status);
    }
    return { rows, ok: true };
  } catch {
    return { rows, ok: false };
  }
}

/** All trackers with saved status changes applied. */
export async function loadAllTrackers(): Promise<{ sites: TrackerSite[]; persistence: Persistence }> {
  const files = loadAllTrackerFiles();
  if (files.length === 0) return { sites: [], persistence: 'saved' };
  const { rows, ok } = await loadOverrides(files.map(s => s.siteId));
  const sites = files.map(s => ({
    ...s,
    tasks: s.tasks.map(t => ({ ...t, status: rows.get(`${s.siteId}/${t.id}`) ?? t.status })),
  }));
  return { sites, persistence: ok ? 'saved' : 'unavailable' };
}

export async function loadTracker(siteId: string): Promise<TrackerWithState | null> {
  const file = loadTrackerFile(siteId);
  if (!file) return null;
  const { rows, ok } = await loadOverrides([siteId]);
  return {
    site: { ...file, tasks: file.tasks.map(t => ({ ...t, status: rows.get(`${siteId}/${t.id}`) ?? t.status })) },
    persistence: ok ? 'saved' : 'unavailable',
  };
}

/** Saves one task's status. Returns false if it could not be stored. */
export async function saveTaskStatus(siteId: string, taskId: string, status: TaskStatus): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from(TABLE)
      .upsert({ site_id: siteId, task_id: taskId, status, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}
