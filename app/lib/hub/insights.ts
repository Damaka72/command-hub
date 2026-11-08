// ── Insights: "Didi, have you thought about…" ────────────────────────────────
// Two sources: a hand-written pool (data/hub/insights.json), three of which
// rotate in each day, and prompts the Hub derives from its own data (a project
// with no next action, a site that is down, a deadline with no priority).
// Derived prompts come first because they are about right now.

import { HUB_INSIGHTS, type HubInsight, type HubProject, type HubSite } from './data';
import { countdownLabel, daysUntil, isoDay } from './dates';

export const INSIGHT_KIND_LABEL: Record<HubInsight['kind'], string> = {
  think: 'Have you thought about…',
  discuss: 'Worth discussing with…',
  advice: 'Worth asking advice on…',
};

/** Deterministic daily pick: same three all day, a different three tomorrow. */
function dailyPick<T>(pool: T[], count: number, now: Date): T[] {
  if (pool.length <= count) return pool;
  const [y, m, d] = isoDay(now).split('-').map(Number);
  const start = (Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) * count) % pool.length;
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

export function buildInsights(input: {
  now: Date;
  projects: HubProject[];
  /** site id → live status, when known */
  siteDown: Set<string>;
  sites: HubSite[];
}): HubInsight[] {
  const { now, projects, siteDown, sites } = input;
  const derived: HubInsight[] = [];

  for (const s of sites) {
    if (siteDown.has(s.id)) {
      derived.push({ id: `down-${s.id}`, kind: 'think', about: s.name, prompt: `${s.name} isn't responding this morning. Does it need looking at before anything else?` });
    }
  }
  for (const p of projects) {
    if (p.status === 'completed') continue;
    if (p.status === null) {
      derived.push({ id: `status-${p.id}`, kind: 'think', about: p.name, prompt: `What is the status of ${p.name}? It has none recorded yet.` });
    }
    if (!p.nextAction) {
      derived.push({ id: `next-${p.id}`, kind: 'think', about: p.name, prompt: `What is the very next action on ${p.name}?` });
    }
    if (p.deadline && p.priority === null) {
      const days = daysUntil(p.deadline.date, now);
      derived.push({ id: `prio-${p.id}`, kind: 'think', about: p.name, prompt: `${p.name} has a deadline (${countdownLabel(days).toLowerCase()}) but no priority. Where does it sit against everything else?` });
    }
  }

  const pool = HUB_INSIGHTS.filter(i => !derived.some(d => d.id === i.id));
  return [...derived.slice(0, 4), ...dailyPick(pool, 3, now)];
}
