"use client";

import TaskList from "./TaskList";

interface Site {
  id: string;
  name: string;
  url: string;
  description: string;
  github: string;
  admin?: string;
  socialAgent?: string;
}

interface SiteStatus {
  up: boolean;
  deploy: { state: string; ago: string; commitMessage: string } | null;
  agent: { status: string; ago: string | null } | null;
}

const DEPLOY_STYLES: Record<string, { dot: string; label: string }> = {
  READY:    { dot: 'bg-emerald-400', label: 'READY' },
  BUILDING: { dot: 'bg-amber-400 animate-pulse', label: 'BUILDING' },
  ERROR:    { dot: 'bg-red-400', label: 'ERROR' },
};

export default function SiteCard({ site, status }: { site: Site; status?: SiteStatus }) {
  const deploy = status?.deploy ?? null;
  const deployStyle = deploy ? (DEPLOY_STYLES[deploy.state] ?? { dot: 'bg-zinc-400', label: deploy.state }) : null;

  const agentLabel = status?.agent
    ? status.agent.status === 'never_run'
      ? 'Never run'
      : status.agent.ago ?? 'Run'
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">

      {/* Status strip */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        {/* Uptime */}
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${status ? (status.up ? 'bg-emerald-400' : 'bg-red-400') : 'bg-zinc-300 dark:bg-zinc-600'}`} />
          {status ? (status.up ? 'Up' : 'Down') : '—'}
        </span>

        <span className="text-zinc-300 dark:text-zinc-700">·</span>

        {/* Vercel deploy */}
        {deployStyle ? (
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${deployStyle.dot}`} />
            {deployStyle.label}
            {deploy?.ago && <span className="text-zinc-400 dark:text-zinc-600">{deploy.ago}</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0 bg-zinc-300 dark:bg-zinc-600" />
            {status && !deploy ? 'No deploy' : '—'}
          </span>
        )}

        <span className="text-zinc-300 dark:text-zinc-700">·</span>

        {/* Agents */}
        <span className="flex items-center gap-1">
          <span>Agents:</span>
          <span className={agentLabel === 'Never run' ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}>
            {agentLabel ?? '—'}
          </span>
        </span>
      </div>

      {/* Site name + description */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{site.name}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{site.description}</p>
        {deploy?.commitMessage && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 truncate" title={deploy.commitMessage}>
            {deploy.commitMessage}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <a href={site.github} target="_blank" rel="noopener noreferrer"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
          GitHub
        </a>
        {site.admin && (
          <a href={site.admin} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
            Admin
          </a>
        )}
        {site.socialAgent && (
          <a href={site.socialAgent} target="_blank" rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
            Social
          </a>
        )}
        <a href={`https://${site.url}`} target="_blank" rel="noopener noreferrer"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
          Visit →
        </a>
      </div>

      {/* URL pill */}
      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">URL</span>
        <span className="text-sm font-mono text-zinc-600 dark:text-zinc-300">{site.url}</span>
      </div>

      {/* Task list */}
      <TaskList siteId={site.id} />
    </div>
  );
}
