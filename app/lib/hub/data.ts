// ── Hub home page: committed data + shared types ─────────────────────────────
// Sites, projects and insight prompts live as JSON in data/hub/ (see the README
// there). Imported, not read with fs, so both server and client code can use
// them and nothing needs file tracing. A mistake in a file fails loudly here
// with the file and item named, the same way the tracker files do.

import sitesFile from '@/data/hub/sites.json';
import projectsFile from '@/data/hub/projects.json';
import insightsFile from '@/data/hub/insights.json';

export interface HubSite {
  id: string;
  name: string;
  short: string;
  url: string;
  vercelProject: string;
  vercelProjectId?: string;
  repo: string;
  adminPath?: string;
  note?: string;
  /** Hub-internal path to a work tracker, if the site has one. */
  tracker?: string;
}

export const PROJECT_STATUSES = ['live', 'active', 'completed', 'on_hold'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface HubProject {
  id: string;
  name: string;
  aka?: string;
  type: 'client' | 'own';
  client: string | null;
  /** Own-brand projects: their part in the story (the why / how / proof). */
  role?: string;
  summary?: string;
  /** null = not yet confirmed. The card says so rather than guessing. */
  status: ProjectStatus | null;
  nextAction: string | null;
  /** Linked site id from sites.json, or null. */
  site: string | null;
  deadline: { date: string; label: string } | null;
  priority: Priority | null;
}

export type InsightKind = 'think' | 'discuss' | 'advice';
export interface HubInsight {
  id: string;
  kind: InsightKind;
  prompt: string;
  about: string;
  withWhom?: string;
}

function fail(file: string, what: string): never {
  throw new Error(`data/hub/${file}: ${what}`);
}

function parseSites(): { sites: HubSite[]; teamId: string; teamSlug: string } {
  const f = sitesFile as { vercelTeamId: string; vercelTeamSlug: string; sites: HubSite[] };
  const seen = new Set<string>();
  for (const s of f.sites) {
    if (!s.id || !s.name || !s.url || !s.vercelProject) fail('sites.json', `site "${s.id ?? '?'}" is missing id, name, url or vercelProject`);
    if (seen.has(s.id)) fail('sites.json', `duplicate site id "${s.id}"`);
    seen.add(s.id);
  }
  return { sites: f.sites, teamId: f.vercelTeamId, teamSlug: f.vercelTeamSlug };
}

function parseProjects(siteIds: Set<string>): HubProject[] {
  const list = (projectsFile as { projects: HubProject[] }).projects;
  const seen = new Set<string>();
  for (const p of list) {
    if (!p.id || !p.name) fail('projects.json', 'a project is missing id or name');
    if (seen.has(p.id)) fail('projects.json', `duplicate project id "${p.id}"`);
    seen.add(p.id);
    if (p.type !== 'client' && p.type !== 'own') fail('projects.json', `"${p.id}" type must be client or own`);
    if (p.status !== null && !PROJECT_STATUSES.includes(p.status)) fail('projects.json', `"${p.id}" has unknown status "${p.status}"`);
    if (p.priority !== null && !PRIORITIES.includes(p.priority)) fail('projects.json', `"${p.id}" has unknown priority "${p.priority}"`);
    if (p.site !== null && !siteIds.has(p.site)) fail('projects.json', `"${p.id}" links to unknown site "${p.site}"`);
    if (p.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(p.deadline.date)) fail('projects.json', `"${p.id}" deadline.date must be YYYY-MM-DD`);
  }
  return list;
}

const parsedSites = parseSites();

export const HUB_SITES: HubSite[] = parsedSites.sites;
export const VERCEL_TEAM_ID = parsedSites.teamId;
export const VERCEL_TEAM_SLUG = parsedSites.teamSlug;
export const HUB_PROJECTS: HubProject[] = parseProjects(new Set(HUB_SITES.map(s => s.id)));
export const HUB_INSIGHTS: HubInsight[] = (insightsFile as { insights: HubInsight[] }).insights;

export function siteById(id: string | null): HubSite | undefined {
  return id ? HUB_SITES.find(s => s.id === id) : undefined;
}
