// ── Shared content_library query helpers ─────────────────────────────────────
// UX spec §7: "Per-site week counts... is the same query /friday already runs;
// extract it into a shared server helper rather than duplicating." Used by
// /api/friday and /api/home.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addWeeks } from './weekDates';

export const STATUS_KEYS = ['draft', 'approved', 'approved_needs_media', 'rejected', 'pushed', 'failed'] as const;
export type StatusKey = (typeof STATUS_KEYS)[number];

export function emptyCounts(): Record<StatusKey, number> {
  return { draft: 0, approved: 0, approved_needs_media: 0, rejected: 0, pushed: 0, failed: 0 };
}

export interface WeekCountsRow {
  siteId: string;
  counts: Record<StatusKey, number>;
  total:  number;
}

// Per-site status counts for one week — the same query /friday runs.
export async function getWeekCounts(
  supabase: SupabaseClient,
  week: string,
  siteIds: string[],
): Promise<WeekCountsRow[]> {
  const { data, error } = await supabase
    .from('content_library')
    .select('site_id, status')
    .eq('week_commencing', week)
    .in('site_id', siteIds);
  if (error) throw error;

  const bySite: Record<string, Record<StatusKey, number>> = {};
  for (const id of siteIds) bySite[id] = emptyCounts();
  for (const row of (data ?? []) as { site_id: string; status: string }[]) {
    const counts = bySite[row.site_id];
    if (counts && (STATUS_KEYS as readonly string[]).includes(row.status)) {
      counts[row.status as StatusKey]++;
    }
  }
  return siteIds.map(siteId => {
    const counts = bySite[siteId];
    const total = STATUS_KEYS.reduce((sum, k) => sum + counts[k], 0);
    return { siteId, counts, total };
  });
}

// Pushed-count per week for `weeksBack` weeks up to and including `currentWeek`
// (oldest first) — powers the home page's 8-bar sparkline.
export async function getPushedSparkline(
  supabase: SupabaseClient,
  currentWeek: string,
  siteIds: string[],
  weeksBack = 8,
): Promise<{ week: string; pushed: number }[]> {
  const earliest = addWeeks(currentWeek, -(weeksBack - 1));
  const { data, error } = await supabase
    .from('content_library')
    .select('week_commencing, site_id, status')
    .gte('week_commencing', earliest)
    .lte('week_commencing', currentWeek)
    .in('site_id', siteIds)
    .eq('status', 'pushed');
  if (error) throw error;

  const rows = (data ?? []) as { week_commencing: string }[];
  const weeks = Array.from({ length: weeksBack }, (_, i) => addWeeks(earliest, i));
  return weeks.map(week => ({
    week,
    pushed: rows.filter(r => r.week_commencing === week).length,
  }));
}

// Consecutive weeks, counting back from `currentWeek`, where every site in
// `siteIds` had at least one pushed row. Honest by construction — the first
// week any site is missing a pushed row breaks the streak.
export async function computeStreak(
  supabase: SupabaseClient,
  currentWeek: string,
  siteIds: string[],
  maxWeeks = 52,
): Promise<number> {
  const earliest = addWeeks(currentWeek, -(maxWeeks - 1));
  const { data, error } = await supabase
    .from('content_library')
    .select('week_commencing, site_id')
    .gte('week_commencing', earliest)
    .lte('week_commencing', currentWeek)
    .in('site_id', siteIds)
    .eq('status', 'pushed');
  if (error) throw error;

  const pushedSitesByWeek = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { week_commencing: string; site_id: string }[]) {
    if (!pushedSitesByWeek.has(row.week_commencing)) pushedSitesByWeek.set(row.week_commencing, new Set());
    pushedSitesByWeek.get(row.week_commencing)!.add(row.site_id);
  }

  let streak = 0;
  let week = currentWeek;
  for (let i = 0; i < maxWeeks; i++) {
    const sites = pushedSitesByWeek.get(week);
    if (!sites || siteIds.some(s => !sites.has(s))) break;
    streak++;
    week = addWeeks(week, -1);
  }
  return streak;
}

// Earliest future scheduled_for across the given sites (or all, if omitted).
export async function getNextOut(
  supabase: SupabaseClient,
  siteIds?: string[],
): Promise<string | null> {
  let query = supabase
    .from('content_library')
    .select('scheduled_for')
    .not('scheduled_for', 'is', null)
    .gt('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1);
  if (siteIds) query = query.in('site_id', siteIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as { scheduled_for: string } | null)?.scheduled_for ?? null;
}
