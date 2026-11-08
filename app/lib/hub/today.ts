// ── "Today": what Didi is meant to be doing ──────────────────────────────────
// Pure: takes the inputs the Today section has gathered and returns a ranked
// list. Four sources, most pressing first:
//   1. Project deadlines that are close or overdue
//   2. Blocked actions, then open actions from the actions log
//   3. Next steps waiting on the site trackers
//   4. Project next actions you have written down
// The weekly-rhythm job (Sat plan, Sun review, ...) is shown separately as
// the day's headline by the section, not as a list item.

import type { HubProject } from './data';
import { siteById } from './data';
import { countdownLabel, daysUntil } from './dates';

export type TodayTone = 'urgent' | 'normal';

export interface TodayItem {
  id: string;
  title: string;
  detail?: string;
  /** Short label for where it came from, e.g. "Deadline", "Action", "Tracker". */
  source: string;
  /** Site or project this belongs to, if any. */
  about?: string;
  tone: TodayTone;
  href?: string;
}

export interface TodayAction {
  id: string;
  siteId: string | null;
  action: string;
  status: 'done' | 'in_progress' | 'blocked';
  link: string | null;
}

export interface TodayTracker {
  siteId: string;
  name: string;
  nextSteps: number;
}

/** Deadlines within this many days (or overdue) are treated as today's business. */
export const DEADLINE_WINDOW_DAYS = 14;

export function buildToday(input: {
  now: Date;
  projects: HubProject[];
  actions: TodayAction[];
  trackers: TodayTracker[];
}): TodayItem[] {
  const { now, projects, actions, trackers } = input;
  const items: TodayItem[] = [];

  // 1. Deadlines (closest first)
  const dated = projects
    .filter(p => p.status !== 'completed' && p.deadline)
    .map(p => ({ p, days: daysUntil(p.deadline!.date, now) }))
    .filter(x => x.days <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);
  for (const { p, days } of dated) {
    items.push({
      id: `deadline-${p.id}`,
      title: p.nextAction ?? `Check where ${p.name} stands`,
      detail: `${countdownLabel(days)} · ${p.deadline!.label}`,
      source: 'Deadline',
      about: p.name,
      tone: days <= 3 ? 'urgent' : 'normal',
    });
  }

  // 2. Actions log: blocked first
  const open = actions.filter(a => a.status !== 'done');
  open.sort((a, b) => Number(b.status === 'blocked') - Number(a.status === 'blocked'));
  for (const a of open) {
    items.push({
      id: `action-${a.id}`,
      title: a.action,
      detail: a.status === 'blocked' ? 'Blocked' : undefined,
      source: 'Action',
      about: siteById(a.siteId)?.name,
      tone: a.status === 'blocked' ? 'urgent' : 'normal',
      href: a.link ?? undefined,
    });
  }

  // 3. Trackers with next steps waiting
  for (const t of trackers) {
    if (t.nextSteps <= 0) continue;
    items.push({
      id: `tracker-${t.siteId}`,
      title: `${t.nextSteps} next step${t.nextSteps === 1 ? '' : 's'} waiting`,
      source: 'Tracker',
      about: t.name,
      tone: 'normal',
      href: `/trackers/${t.siteId}`,
    });
  }

  // 4. Project next actions not already covered by a deadline item
  const covered = new Set(dated.map(x => x.p.id));
  const order = { high: 0, medium: 1, low: 2 } as const;
  const withNext = projects
    .filter(p => p.status !== 'completed' && p.nextAction && !covered.has(p.id))
    .sort((a, b) => (a.priority ? order[a.priority] : 3) - (b.priority ? order[b.priority] : 3));
  for (const p of withNext) {
    items.push({
      id: `next-${p.id}`,
      title: p.nextAction!,
      source: 'Project',
      about: p.name,
      tone: p.priority === 'high' ? 'urgent' : 'normal',
    });
  }

  return items;
}
