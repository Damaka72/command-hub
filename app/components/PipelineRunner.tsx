"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineStatusResponse } from "../api/pipeline/route";
import type { WorkflowStep, RunConclusion } from "../lib/github";

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
  if (step.status === 'in_progress') { icon = '◐'; color = '#22d3ee'; }
  else if (step.status === 'completed') {
    if (step.conclusion === 'success') { icon = '✓'; color = '#34d399'; }
    else if (step.conclusion === 'skipped') { icon = '–'; color = 'var(--hub-text-3)'; }
    else { icon = '✗'; color = '#f87171'; }
  }
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className={step.status === 'in_progress' ? 'animate-hub-pulse' : ''} style={{ color, width: 12 }}>{icon}</span>
      <span style={{ color: step.status === 'in_progress' ? 'var(--hub-text-1)' : 'var(--hub-text-2)' }}>{step.name}</span>
    </div>
  );
}

export default function PipelineRunner() {
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
      // Poll fast while a run is active, slow otherwise.
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
        // Poll a few times to catch the new run appearing.
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

  const configured = data?.configured ?? false;
  const activeRun = data?.activeRun ?? null;
  const latest = data?.runs?.[0] ?? null;
  const steps = data?.activeJobs?.[0]?.steps ?? [];

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hub-text-1)' }}>Content Pipeline</h2>
          <p className="text-[11px]" style={{ color: 'var(--hub-text-3)' }}>
            What&rsquo;s happening now — generate this week&rsquo;s posts across all 5 sites
          </p>
        </div>

        {/* Run control */}
        <div className="flex shrink-0 items-center gap-2">
          {!configured ? (
            <span
              className="rounded-lg px-3 py-1.5 text-[11px]"
              style={{ background: 'var(--hub-surface-2)', color: 'var(--hub-text-3)', border: '1px solid var(--hub-border)' }}
              title="Set GITHUB_TOKEN to enable triggering from the dashboard"
            >
              Run disabled — no GITHUB_TOKEN
            </span>
          ) : activeRun ? (
            <span
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--hub-cyan)', border: '1px solid rgba(34,211,238,0.3)' }}
            >
              <span className="h-2 w-2 animate-hub-pulse rounded-full" style={{ background: 'var(--hub-cyan)' }} />
              Running…
            </span>
          ) : confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px]" style={{ color: 'var(--hub-gold)' }}>Publishes to Blotato — sure?</span>
              <button
                onClick={trigger}
                disabled={triggering}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'var(--hub-accent)', color: '#fff', border: '1px solid var(--hub-accent)' }}
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
              style={{ background: 'var(--hub-accent-dim)', color: '#a5b4fc', border: '1px solid var(--hub-border-hi)' }}
            >
              ▶ Run pipeline
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--hub-text-2)' }}>{message}</p>
      )}

      {/* Live run detail */}
      {activeRun && steps.length > 0 && (
        <div className="mt-4 rounded-lg p-3" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hub-cyan)' }}>
              Live run
            </span>
            <a href={activeRun.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] hover:underline" style={{ color: 'var(--hub-text-3)' }}>
              View on GitHub →
            </a>
          </div>
          <div className="space-y-1">
            {steps.map(s => <StepRow key={s.number} step={s} />)}
          </div>
        </div>
      )}

      {/* Last run summary (when idle) */}
      {!activeRun && configured && latest && (
        <div className="mt-3 flex items-center gap-2 text-[11px]">
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
        <p className="mt-3 text-[11px]" style={{ color: 'var(--hub-text-3)' }}>No runs yet — trigger one to get started.</p>
      )}
    </section>
  );
}
