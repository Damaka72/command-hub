"use client";

// ── Automation status ────────────────────────────────────────────────────
// One panel answering "is the automation working" three ways that used to be
// three separate panels on Home: the lead coordinator + per-site subagent
// strip (was AgentCommandCentre), the pipeline run control + live/last run
// detail (was PipelineRunner), and the activity log (was ActivityFeed).

import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioCoordinator, SiteDetail } from "../api/status/route";
import type { PipelineStatusResponse } from "../api/pipeline/route";
import type { WorkflowStep, RunConclusion } from "../lib/github";
import type { ActivityEvent, ActivityLevel } from "../api/activity/route";
import { SITE_SHORT } from "../lib/siteConstants";

const SITE_ORDER = [
  'masteryourcareerpath',
  'theconcurrentcontractor',
  'oldoaktown',
  'aiviralvideoprompts',
] as const;

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (diff < 60000) return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

const SUBAGENT_PILL: Record<string, { bg: string; color: string; extra?: string }> = {
  idle:      { bg: 'rgba(71,85,105,0.3)',  color: '#94a3b8' },
  running:   { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', extra: 'animate-pulse' },
  complete:  { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  error:     { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  never_run: { bg: 'rgba(30,41,59,0.6)',   color: '#475569' },
};

const GRADER_PILL: Record<string, { bg: string; color: string }> = {
  pass:  { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  fail:  { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  retry: { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
};

function conclusionLabel(c: RunConclusion): { text: string; color: string } {
  switch (c) {
    case 'success':   return { text: 'Succeeded', color: '#34d399' };
    case 'failure':   return { text: 'Failed',    color: '#f87171' };
    case 'timed_out': return { text: 'Timed out', color: '#f87171' };
    case 'cancelled': return { text: 'Cancelled', color: '#fbbf24' };
    default:          return { text: 'Finished',  color: '#94a3b8' };
  }
}

function StepRow({ step }: { step: WorkflowStep }) {
  let icon = '○';
  let color = 'var(--hub-text-3)';
  if (step.status === 'in_progress') { icon = '◐'; color = 'var(--hub-cyan)'; }
  else if (step.status === 'completed') {
    if (step.conclusion === 'success') { icon = '✓'; color = '#34d399'; }
    else if (step.conclusion === 'skipped') { icon = '–'; color = 'var(--hub-text-3)'; }
    else { icon = '✗'; color = '#f87171'; }
  }
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className={step.status === 'in_progress' ? 'animate-hub-pulse' : ''} style={{ color, width: 12 }}>{icon}</span>
      <span style={{ color: step.status === 'in_progress' ? 'var(--hub-text-1)' : 'var(--hub-text-2)' }}>{step.name}</span>
    </div>
  );
}

const ACTIVITY_LEVEL_DOT: Record<ActivityLevel, string> = {
  success: '#34d399',
  warning: '#fbbf24',
  error:   '#f87171',
  running: '#6a9bcc',
  info:    '#94a3b8',
};

function CoordinatorAndSubagents({ portfolioCoordinator, sites }: { portfolioCoordinator: PortfolioCoordinator | null; sites: Record<string, SiteDetail> }) {
  return (
    <div className="flex flex-wrap gap-6">
      {/* Lead Coordinator */}
      <div className="w-full sm:w-1/4 min-w-0 sm:shrink-0">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
          Lead Coordinator
        </p>
        <p className="mt-1 font-mono text-[12px]" style={{ color: 'var(--hub-text-3)' }}>
          content-coordinator.json
        </p>
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs" style={{ color: 'var(--hub-text-3)' }}>Last run</span>
            <span className="text-xs font-medium" style={{ color: 'var(--hub-text-2)' }}>
              {relativeTime(portfolioCoordinator?.lastRun ?? null)}
            </span>
          </div>
          <div>
            <span className="text-xs" style={{ color: 'var(--hub-text-3)' }}>Theme </span>
            <span className="text-xs font-medium" style={{ color: portfolioCoordinator?.weeklyTheme ? 'var(--hub-text-1)' : 'var(--hub-text-3)' }}>
              {portfolioCoordinator?.weeklyTheme ?? 'Not set'}
            </span>
          </div>
          {portfolioCoordinator?.campaignObjective && (
            <p className="text-xs leading-snug" style={{ color: 'var(--hub-text-2)' }}>
              {portfolioCoordinator.campaignObjective.slice(0, 60)}
              {portfolioCoordinator.campaignObjective.length > 60 && '…'}
            </p>
          )}
        </div>
      </div>

      {/* Subagent strip */}
      <div className="flex flex-1 min-w-[240px] gap-2">
        {SITE_ORDER.map(siteId => {
          const detail = sites[siteId];
          const subagent = detail?.subagentStatus ?? null;
          const grader   = detail?.graderVerdict   ?? null;
          const statusKey  = subagent?.status ?? 'never_run';
          const verdictKey = grader?.verdict;
          const pillStyle  = SUBAGENT_PILL[statusKey] ?? SUBAGENT_PILL.never_run;

          return (
            <div
              key={siteId}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2"
              style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}
            >
              <span className="text-[12px] font-bold" style={{ color: 'var(--hub-text-2)' }}>
                {SITE_SHORT[siteId] ?? siteId}
              </span>

              <span
                className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${pillStyle.extra ?? ''}`}
                style={{ background: pillStyle.bg, color: pillStyle.color }}
              >
                {statusKey.replace('_', ' ')}
              </span>

              {verdictKey && verdictKey !== 'never_run' ? (() => {
                const gs = GRADER_PILL[verdictKey];
                return gs ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                    style={{ background: gs.bg, color: gs.color }}
                  >
                    {verdictKey}{(grader?.retryCount ?? 0) > 0 ? ` (×${grader!.retryCount})` : ''}
                  </span>
                ) : null;
              })() : (
                <span className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>—</span>
              )}

              {grader?.rubricName && (
                <span className="text-center text-[11px] leading-tight" style={{ color: 'var(--hub-text-3)' }}>
                  {grader.rubricName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch status */}
      <div className="w-full sm:w-1/4 min-w-0 sm:shrink-0">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
          Batch Status
        </p>
        <div className="mt-2 flex gap-4">
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#34d399' }}>
              {portfolioCoordinator?.batchStatus.approved ?? 0}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>Approved</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: 'var(--hub-text-2)' }}>
              {portfolioCoordinator?.batchStatus.pending ?? 0}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>Pending</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#f87171' }}>
              {portfolioCoordinator?.batchStatus.failed ?? 0}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>Failed</p>
          </div>
        </div>
        {portfolioCoordinator?.batchStatus.readyForReview && (
          <a
            href="#review-queue"
            className="mt-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            ⚑ Batch ready — review before publishing
          </a>
        )}
      </div>
    </div>
  );
}

function usePipelineStatus() {
  const [data, setData] = useState<PipelineStatusResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline');
      const json = await res.json() as PipelineStatusResponse;
      setData(json);
      const active = !!json.activeRun;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, active ? 5_000 : 25_000);
    } catch {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, 25_000);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [load]);

  const trigger = useCallback(async () => {
    setTriggering(true);
    setMessage(null);
    setConfirming(false);
    try {
      const res = await fetch('/api/pipeline', { method: 'POST' });
      const json = await res.json() as { ok: boolean; reason?: string };
      if (json.ok) {
        setMessage('Pipeline triggered — it can take ~20s to appear, then runs for a few minutes.');
        setTimeout(load, 8_000);
        setTimeout(load, 16_000);
      } else {
        setMessage(json.reason === 'no_token'
          ? 'GITHUB_TOKEN not configured — cannot trigger from the dashboard.'
          : `Could not trigger: ${json.reason ?? 'unknown error'}`);
      }
    } catch {
      setMessage('Could not reach the trigger endpoint.');
    } finally {
      setTriggering(false);
    }
  }, [load]);

  return { data, confirming, setConfirming, triggering, message, setMessage, trigger };
}

function PipelineControl({ pipeline }: { pipeline: ReturnType<typeof usePipelineStatus> }) {
  const { data, confirming, setConfirming, triggering, message, setMessage, trigger } = pipeline;
  const configured = data?.configured ?? false;
  const activeRun = data?.activeRun ?? null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {!configured ? (
        <span
          className="rounded-lg px-3 py-1.5 text-[13px]"
          style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-3)', border: '1px solid var(--hub-border)' }}
          title="Set GITHUB_TOKEN to enable triggering from the dashboard"
        >
          Run disabled — no GITHUB_TOKEN
        </span>
      ) : activeRun ? (
        <span
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{ background: 'rgba(106,155,204,0.12)', color: 'var(--hub-cyan)', border: '1px solid rgba(106,155,204,0.3)' }}
        >
          <span className="h-2 w-2 animate-hub-pulse rounded-full" style={{ background: 'var(--hub-cyan)' }} />
          Running…
        </span>
      ) : confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: 'var(--hub-gold)' }}>Generates this week&rsquo;s drafts for review — go?</span>
          <button
            onClick={trigger}
            disabled={triggering}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--hub-accent)', color: 'var(--hub-accent-ink)', border: '1px solid var(--hub-accent)' }}
          >
            {triggering ? 'Starting…' : 'Yes, run it'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg px-2.5 py-1.5 text-xs transition-all hover:brightness-110"
            style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setConfirming(true); setMessage(null); }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110"
          style={{ background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--hub-border-hi)' }}
        >
          ▶ Run pipeline
        </button>
      )}
    </div>
  );
}

function PipelineDetail({ pipeline }: { pipeline: ReturnType<typeof usePipelineStatus> }) {
  const { data, message } = pipeline;
  const configured = data?.configured ?? false;
  const activeRun = data?.activeRun ?? null;
  const latest = data?.runs?.[0] ?? null;
  const steps = data?.activeJobs?.[0]?.steps ?? [];

  return (
    <>
      {message && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--hub-text-2)' }}>{message}</p>
      )}

      {activeRun && steps.length > 0 && (
        <div className="mt-4 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-cyan)' }}>
              Live run
            </span>
            <a href={activeRun.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] hover:underline" style={{ color: 'var(--hub-text-3)' }}>
              View on GitHub →
            </a>
          </div>
          <div className="space-y-1">
            {steps.map(s => <StepRow key={s.number} step={s} />)}
          </div>
        </div>
      )}

      {!activeRun && configured && latest && (
        <div className="mt-3 flex items-center gap-2 text-[13px]">
          <span style={{ color: 'var(--hub-text-3)' }}>Last run</span>
          <span className="font-medium" style={{ color: conclusionLabel(latest.conclusion).color }}>
            {conclusionLabel(latest.conclusion).text}
          </span>
          <span style={{ color: 'var(--hub-text-3)' }}>· {relativeTime(latest.startedAt ?? latest.createdAt)}</span>
          <a href={latest.htmlUrl} target="_blank" rel="noopener noreferrer" className="ml-auto hover:underline" style={{ color: 'var(--hub-text-3)' }}>
            View →
          </a>
        </div>
      )}

      {!activeRun && configured && !latest && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--hub-text-3)' }}>No runs yet — trigger one to get started.</p>
      )}
    </>
  );
}

function ActivityLog() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  const load = useCallback(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then((d: { events: ActivityEvent[] }) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-accent)', letterSpacing: '0.1em' }}>
          Activity
        </span>
        <span className="text-[12px]" style={{ color: 'var(--hub-text-3)' }}>
          {events === null ? 'Loading…' : `${events.length} event${events.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {events === null ? (
        <div className="py-6 text-center text-xs" style={{ color: 'var(--hub-text-3)' }}>Loading activity…</div>
      ) : events.length === 0 ? (
        <div className="rounded-lg py-8 text-center" style={{ background: 'var(--hub-surface-2)', border: '1px dashed var(--hub-border)' }}>
          <p className="text-xs" style={{ color: 'var(--hub-text-2)' }}>No pipeline runs recorded yet.</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            Runs will appear here as they happen — trigger one above or wait for Sunday&rsquo;s scheduled run.
          </p>
        </div>
      ) : (
        <ol className="relative max-h-72 space-y-0 overflow-y-auto pr-1">
          {events.map((e, i) => (
            <li key={e.id} className="relative flex gap-3 pb-4">
              {i < events.length - 1 && (
                <span className="absolute left-[5px] top-4 bottom-0 w-px" style={{ background: 'var(--hub-border)' }} />
              )}
              <span
                className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${e.level === 'running' ? 'animate-hub-pulse' : ''}`}
                style={{ background: ACTIVITY_LEVEL_DOT[e.level], boxShadow: `0 0 6px ${ACTIVITY_LEVEL_DOT[e.level]}80` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-medium" style={{ color: 'var(--hub-text-1)' }}>
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{e.title}</a>
                    ) : e.title}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: 'var(--hub-text-3)' }}>{relativeTime(e.at)}</span>
                </div>
                {e.detail && (
                  <p className="mt-0.5 truncate text-[13px]" style={{ color: 'var(--hub-text-2)' }}>{e.detail}</p>
                )}
                {e.meta.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.meta.map((m, j) => (
                      <span
                        key={j}
                        className="rounded-full px-1.5 py-0.5 text-[11px]"
                        style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)', color: 'var(--hub-text-3)' }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface Props {
  portfolioCoordinator: PortfolioCoordinator | null;
  sites: Record<string, SiteDetail>;
}

export default function AutomationStatus({ portfolioCoordinator, sites }: Props) {
  const pipeline = usePipelineStatus();

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hub-text-1)' }}>Automation</h2>
          <p className="text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            Coordinator, pipeline run, and activity — is it working, all in one place
          </p>
        </div>
        <PipelineControl pipeline={pipeline} />
      </div>

      <PipelineDetail pipeline={pipeline} />

      <div className="my-4" style={{ borderTop: '1px solid var(--hub-border)' }} />

      <CoordinatorAndSubagents portfolioCoordinator={portfolioCoordinator} sites={sites} />

      <div className="my-4" style={{ borderTop: '1px solid var(--hub-border)' }} />

      <ActivityLog />
    </section>
  );
}
