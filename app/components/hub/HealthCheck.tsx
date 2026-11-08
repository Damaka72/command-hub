'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HealthResponse, SiteHealth } from '@/app/api/hub/health/route';
import { HUB_PROJECTS, HUB_SITES, VERCEL_TEAM_SLUG, siteById, type HubProject, type HubSite, type Priority, type ProjectStatus } from '@/app/lib/hub/data';
import { countdownLabel, daysUntil, shortDate, timeAgo } from '@/app/lib/hub/dates';
import { Card, Pill, Section, SectionHead, Notice, btnQuiet, DISPLAY_FONT, type Tone } from './ui';
import { useNow } from './useNow';

const REFRESH_MS = 120_000;

// ── Sites ───────────────────────────────────────────────────────────────────

const STATE_PILL: Record<SiteHealth['state'], { tone: Tone; glyph: string; label: string }> = {
  live: { tone: 'ok', glyph: '●', label: 'Live' },
  attention: { tone: 'warn', glyph: '▲', label: 'Needs attention' },
  down: { tone: 'bad', glyph: '✕', label: 'Down' },
  unknown: { tone: 'neutral', glyph: '?', label: 'Not checked' },
};

const DEPLOY_TEXT: Record<string, string> = { READY: 'Deployed', ERROR: 'Failed', BUILDING: 'Building', QUEUED: 'Queued', CANCELED: 'Cancelled' };

function LinkRow({ site }: { site: HubSite }) {
  const link = 'inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-news-ink-2 underline underline-offset-2 hover:text-news-ink';
  return (
    <div className="-mx-2 flex flex-wrap">
      <a href={site.url} target="_blank" rel="noopener noreferrer" className={link}>Visit site<span className="sr-only"> {site.name}</span> ↗</a>
      {site.adminPath && <a href={site.url + site.adminPath} target="_blank" rel="noopener noreferrer" className={link}>Admin<span className="sr-only"> for {site.name}</span> ↗</a>}
      <a href={`https://github.com/${site.repo}`} target="_blank" rel="noopener noreferrer" className={link}>GitHub<span className="sr-only"> for {site.name}</span> ↗</a>
      <a href={`https://vercel.com/${VERCEL_TEAM_SLUG}/${site.vercelProject}`} target="_blank" rel="noopener noreferrer" className={link}>Vercel<span className="sr-only"> for {site.name}</span> ↗</a>
      {site.tracker && <a href={site.tracker} className={link}>Tracker<span className="sr-only"> for {site.name}</span></a>}
    </div>
  );
}

function SiteCard({ site, health, deploysConfigured }: { site: HubSite; health?: SiteHealth; deploysConfigured: boolean }) {
  const pill = health ? STATE_PILL[health.state] : null;
  const edge = health ? { live: 'border-t-news-ok', attention: 'border-t-news-warn', down: 'border-t-news-bad', unknown: 'border-t-news-rule' }[health.state] : 'border-t-news-rule';
  return (
    <Card className={`flex flex-col gap-2 border-t-4 ${edge}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-snug" style={DISPLAY_FONT}>{site.name}</h3>
        {pill ? <Pill tone={pill.tone} glyph={pill.glyph}>{pill.label}</Pill> : <Pill tone="neutral">Checking…</Pill>}
      </div>
      <p className="text-xs text-news-ink-3">{site.url.replace('https://', '')}</p>
      {health?.reason && <p className="text-sm font-medium text-news-ink">{health.reason}</p>}
      <p className="text-sm text-news-ink-2">
        {health?.deploy
          ? `${DEPLOY_TEXT[health.deploy.state] ?? health.deploy.state} ${timeAgo(health.deploy.createdAt)}${health.deploy.commitMessage ? ` · ${health.deploy.commitMessage}` : ''}`
          : health
            ? deploysConfigured ? 'No production deploy found' : 'Last deploy: add VERCEL_TOKEN to show'
            : ' '}
        {health?.responseMs != null && <span className="text-news-ink-3"> · {health.responseMs} ms</span>}
      </p>
      {site.note && <p className="text-xs text-news-gold-ink">{site.note}</p>}
      <LinkRow site={site} />
    </Card>
  );
}

// ── Projects ────────────────────────────────────────────────────────────────

const STATUS_PILL: Record<ProjectStatus, { tone: Tone; glyph: string; label: string }> = {
  live: { tone: 'ok', glyph: '●', label: 'Live' },
  active: { tone: 'gold', glyph: '◐', label: 'In progress' },
  completed: { tone: 'neutral', glyph: '✓', label: 'Completed' },
  on_hold: { tone: 'warn', glyph: '❚❚', label: 'On hold' },
};
const PRIORITY_LABEL: Record<Priority, string> = { high: '▲ High priority', medium: '◆ Medium priority', low: '▽ Low priority' };

function ProjectCard({ project, siteHealth, now }: { project: HubProject; siteHealth?: SiteHealth; now: Date | null }) {
  const status = project.status ? STATUS_PILL[project.status] : null;
  const site = siteById(project.site);
  const days = project.deadline && now ? daysUntil(project.deadline.date, now) : null;
  const closing = days !== null && days <= 14 && project.status !== 'completed';
  const dim = project.status === 'completed';
  return (
    <Card className={`flex flex-col gap-2 ${dim ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-base font-semibold leading-snug" style={DISPLAY_FONT}>{project.name}</h4>
          {project.aka && <p className="text-xs text-news-ink-3">{project.aka}</p>}
        </div>
        {status ? <Pill tone={status.tone} glyph={status.glyph}>{status.label}</Pill> : <Pill tone="neutral" glyph="?">Status to confirm</Pill>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Pill tone="neutral">{project.type === 'client' ? `Client · ${project.client}` : 'Own venture'}</Pill>
        {project.role && <Pill tone="gold">{project.role}</Pill>}
        {project.priority && <span className="inline-flex items-center rounded-full border border-news-rule px-2.5 py-0.5 text-xs font-semibold text-news-ink-2">{PRIORITY_LABEL[project.priority]}</span>}
      </div>

      {project.summary && <p className="text-sm text-news-ink-2">{project.summary}</p>}

      <p className="text-sm">
        <span className="font-semibold">Next: </span>
        {project.nextAction ?? <span className="text-news-ink-3">No next action set</span>}
      </p>

      <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-news-ink-2">
        <div className="flex gap-1">
          <dt className="font-semibold">Deadline</dt>
          <dd className={closing ? 'font-semibold text-news-bad' : ''}>
            {project.deadline ? `${project.deadline.label} (${shortDate(project.deadline.date)})${days !== null ? ` · ${countdownLabel(days)}` : ''}` : 'None set'}
          </dd>
        </div>
        {project.type === 'own' && (
          <div className="flex gap-1">
            <dt className="font-semibold">Brand</dt><dd>Didi Anolue</dd>
          </div>
        )}
        {site && (
          <div className="flex gap-1">
            <dt className="font-semibold">Site</dt>
            <dd>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{site.name}</a>
              {siteHealth && <span className="text-news-ink-3"> ({STATE_PILL[siteHealth.state].label.toLowerCase()})</span>}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}

function ProjectGroup({ title, hint, projects, health, now }: { title: string; hint?: string; projects: HubProject[]; health: Record<string, SiteHealth>; now: Date | null }) {
  if (!projects.length) return null;
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-news-ink-2">{title}{hint && <span className="ml-2 font-normal normal-case tracking-normal text-news-ink-3">{hint}</span>}</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(p => <ProjectCard key={p.id} project={p} siteHealth={p.site ? health[p.site] : undefined} now={now} />)}
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export default function HealthCheck() {
  const now = useNow();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchHealth = useCallback(() => {
    return fetch('/api/hub/health')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<HealthResponse>; })
      .then(d => { setData(d); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  // Button press: show "Checking…" while it runs.
  const refresh = useCallback(() => {
    setBusy(true);
    fetchHealth().finally(() => setBusy(false));
  }, [fetchHealth]);

  // First load and the background refresh set state only in the fetch callbacks.
  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const byId: Record<string, SiteHealth> = Object.fromEntries((data?.sites ?? []).map(s => [s.id, s]));
  const unchecked = (data?.sites ?? []).some(s => s.state === 'unknown');
  const problems = (data?.sites ?? []).filter(s => s.state === 'down' || s.state === 'attention').length;

  const clients = HUB_PROJECTS.filter(p => p.type === 'client' && p.status !== 'completed');
  const own = HUB_PROJECTS.filter(p => p.type === 'own' && p.status !== 'completed');
  const completed = HUB_PROJECTS.filter(p => p.status === 'completed');

  return (
    <Section id="health">
      <SectionHead
        id="health-h"
        kicker="Health check"
        title={data ? (unchecked ? "Couldn't check the sites just now" : problems ? `${problems} of ${HUB_SITES.length} need a look` : `All ${HUB_SITES.length} sites are live`) : 'Checking your sites…'}
        aside={
          <button type="button" onClick={refresh} disabled={busy} className={btnQuiet} aria-label="Check the sites again">
            {busy ? 'Checking…' : data ? `Checked ${timeAgo(data.checkedAt, now?.getTime())}` : 'Check now'} ↻
          </button>
        }
      />
      {failed && !data && <div className="mb-3"><Notice>The health check couldn&rsquo;t run. Try again in a moment.</Notice></div>}

      <h3 className="sr-only">Sites</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {HUB_SITES.map(s => <SiteCard key={s.id} site={s} health={byId[s.id]} deploysConfigured={data?.deploysConfigured ?? true} />)}
      </div>

      <ProjectGroup title="Client work" projects={clients} health={byId} now={now} />
      <ProjectGroup title="Own brand" hint="Didi Anolue: the why, the how and the proof" projects={own} health={byId} now={now} />

      {completed.length > 0 && (
        <details className="mt-5">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold uppercase tracking-[0.12em] text-news-ink-2">
            Completed ({completed.length})
          </summary>
          <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {completed.map(p => <ProjectCard key={p.id} project={p} siteHealth={undefined} now={now} />)}
          </div>
        </details>
      )}
    </Section>
  );
}
