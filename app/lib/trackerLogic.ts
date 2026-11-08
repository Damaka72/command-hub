// ── Site work tracker — shared types and pure logic ─────────────────────────
// No server-only imports here, so both the API routes and the client
// components use the same maths. A site's tracker is one JSON file in
// data/trackers/ (see data/trackers/README.md); status changes made in the
// Hub are stored separately and laid over the file (see trackerStore.ts).

export const STATUSES = ['todo', 'in_progress', 'done', 'parked'] as const;
export type TaskStatus = (typeof STATUSES)[number];

export const OWNERS = ['didi', 'claude', 'both'] as const;
export type TaskOwner = (typeof OWNERS)[number];

export interface TrackerTask {
  id:      string;
  area:    string;
  title:   string;
  detail?: string;
  status:  TaskStatus;
  owner:   TaskOwner;
  /** True when this is one of the next things to do. */
  next:    boolean;
  /** Free text, e.g. "Before launch" or "Week of 10 Nov". */
  when?:   string;
  /** Sort order across the whole site; areas appear in order of first task. */
  order:   number;
}

export interface TrackerSite {
  siteId:       string;
  name:         string;
  description?: string;
  /** Public address, with or without https://. Leave out until there is one. */
  url?:         string;
  /** owner/repo on GitHub. */
  repo?:        string;
  /** Hex colour for the site's identity dot. */
  accent?:      string;
  tasks:        TrackerTask[];
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo:        'To do',
  in_progress: 'In progress',
  done:        'Done',
  parked:      'Parked',
};

export const STATUS_HINT: Record<TaskStatus, string> = {
  todo:        'Ready to be picked up',
  in_progress: 'Being worked on now',
  done:        'Finished',
  parked:      'Deliberately not started yet',
};

export const OWNER_LABEL: Record<TaskOwner, string> = {
  didi:   'Didi',
  claude: 'Claude',
  both:   'Didi + Claude',
};

export interface TrackerCounts {
  total:       number;
  done:        number;
  in_progress: number;
  todo:        number;
  parked:      number;
}

export interface TrackerSummary {
  siteId:      string;
  name:        string;
  accent?:     string;
  counts:      TrackerCounts;
  /** Whole-number percentage of every task that is done (parked tasks count in the total). */
  percentDone: number;
  /** Next-step tasks that are not yet done. */
  nextSteps:   number;
  /** The open next-step tasks themselves, in order, for the home-page panel. */
  nextTasks:   TrackerTask[];
  url?:        string;
}

export function countTasks(tasks: TrackerTask[]): TrackerCounts {
  const counts: TrackerCounts = { total: tasks.length, done: 0, in_progress: 0, todo: 0, parked: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}

export function percentDone(counts: TrackerCounts): number {
  return counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100);
}

/** A next step still needs doing: flagged next, and neither finished nor parked. */
export function isOpenNextStep(t: TrackerTask): boolean {
  return t.next && (t.status === 'todo' || t.status === 'in_progress');
}

export function summarise(site: TrackerSite): TrackerSummary {
  const counts = countTasks(site.tasks);
  const nextTasks = site.tasks.filter(isOpenNextStep).sort((a, b) => a.order - b.order);
  return {
    siteId:      site.siteId,
    name:        site.name,
    accent:      site.accent,
    url:         site.url,
    counts,
    percentDone: percentDone(counts),
    nextSteps:   nextTasks.length,
    nextTasks,
  };
}

/** Adds up the counts of several trackers (for the home-page summary band). */
export function sumCounts(all: TrackerCounts[]): TrackerCounts {
  const sum: TrackerCounts = { total: 0, done: 0, in_progress: 0, todo: 0, parked: 0 };
  for (const c of all) {
    sum.total += c.total; sum.done += c.done; sum.in_progress += c.in_progress;
    sum.todo += c.todo; sum.parked += c.parked;
  }
  return sum;
}

// ── Filter chips ────────────────────────────────────────────────────────────
export const FILTERS = ['all', 'needs_you', 'hide_done'] as const;
export type TaskFilter = (typeof FILTERS)[number];

export const FILTER_LABEL: Record<TaskFilter, string> = {
  all:       'Everything',
  needs_you: 'Needs you',
  hide_done: 'Hide done',
};

/**
 * "Needs you" = still to do or in progress, and Didi (or Didi + Claude) owns it.
 * Parked work is deliberately waiting, so it never "needs you" yet.
 */
export function matchesFilter(t: TrackerTask, filter: TaskFilter): boolean {
  switch (filter) {
    case 'all':       return true;
    case 'hide_done': return t.status !== 'done';
    case 'needs_you': return (t.status === 'todo' || t.status === 'in_progress') && t.owner !== 'claude';
  }
}

/** A public address as a clickable link plus the text to show for it. */
export function siteLink(url: string): { href: string; label: string } {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return { href, label: href.replace(/^https?:\/\//i, '').replace(/\/$/, '') };
}

export interface TaskArea {
  name:   string;
  tasks:  TrackerTask[];
  counts: TrackerCounts;
}

/** Groups tasks by area. Areas and the tasks in them follow `order`. */
export function groupByArea(tasks: TrackerTask[]): TaskArea[] {
  const sorted = [...tasks].sort((a, b) => a.order - b.order);
  const areas = new Map<string, TrackerTask[]>();
  for (const t of sorted) {
    const list = areas.get(t.area);
    if (list) list.push(t);
    else areas.set(t.area, [t]);
  }
  return [...areas].map(([name, list]) => ({ name, tasks: list, counts: countTasks(list) }));
}

/** The one-tap "move on" step for a task, or null if there is nowhere sensible to go. */
export function advance(status: TaskStatus): { to: TaskStatus; label: string } {
  switch (status) {
    case 'todo':        return { to: 'in_progress', label: 'Start' };
    case 'in_progress': return { to: 'done',        label: 'Mark done' };
    case 'done':        return { to: 'todo',        label: 'Reopen' };
    case 'parked':      return { to: 'todo',        label: 'Unpark' };
  }
}

export function isStatus(v: unknown): v is TaskStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

/**
 * Checks a parsed JSON file is a usable tracker and returns it typed. Throws an
 * error naming the file and the problem, so a typo in a new data file is found
 * at once rather than showing up as a blank page.
 */
export function parseTrackerSite(raw: unknown, source: string): TrackerSite {
  const fail = (msg: string): never => { throw new Error(`Tracker ${source}: ${msg}`); };
  if (!raw || typeof raw !== 'object') return fail('not a JSON object');
  const o = raw as Record<string, unknown>;

  const str = (k: string): string => {
    const v = o[k];
    return typeof v === 'string' && v.trim() ? v : fail(`"${k}" must be a non-empty string`);
  };
  const optStr = (obj: Record<string, unknown>, k: string, where: string): string | undefined => {
    const v = obj[k];
    if (v === undefined) return undefined;
    return typeof v === 'string' ? v : fail(`${where}: "${k}" must be a string`);
  };

  const siteId = str('siteId');
  if (!/^[a-z0-9-]+$/.test(siteId)) fail('"siteId" may only use lower-case letters, numbers and hyphens');
  if (!Array.isArray(o.tasks) || o.tasks.length === 0) fail('"tasks" must be a non-empty array');

  const seen = new Set<string>();
  const tasks = (o.tasks as unknown[]).map((rawTask, i): TrackerTask => {
    if (!rawTask || typeof rawTask !== 'object') return fail(`task ${i} is not an object`);
    const t = rawTask as Record<string, unknown>;
    const where = `task ${i}`;
    const id = typeof t.id === 'string' && t.id ? t.id : fail(`${where}: "id" must be a non-empty string`);
    if (seen.has(id)) fail(`duplicate task id "${id}"`);
    seen.add(id);
    const area  = typeof t.area  === 'string' && t.area  ? t.area  : fail(`${id}: "area" is required`);
    const title = typeof t.title === 'string' && t.title ? t.title : fail(`${id}: "title" is required`);
    if (!isStatus(t.status)) fail(`${id}: "status" must be one of ${STATUSES.join(', ')}`);
    if (typeof t.owner !== 'string' || !(OWNERS as readonly string[]).includes(t.owner)) {
      fail(`${id}: "owner" must be one of ${OWNERS.join(', ')}`);
    }
    if (typeof t.next !== 'boolean') fail(`${id}: "next" must be true or false`);
    if (typeof t.order !== 'number' || !Number.isFinite(t.order)) fail(`${id}: "order" must be a number`);
    return {
      id, area, title,
      detail: optStr(t, 'detail', id),
      when:   optStr(t, 'when', id),
      status: t.status as TaskStatus,
      owner:  t.owner as TaskOwner,
      next:   t.next as boolean,
      order:  t.order as number,
    };
  });

  return {
    siteId,
    name:        str('name'),
    description: optStr(o, 'description', 'site'),
    url:         optStr(o, 'url', 'site'),
    repo:        optStr(o, 'repo', 'site'),
    accent:      optStr(o, 'accent', 'site'),
    tasks,
  };
}
