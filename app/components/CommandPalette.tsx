'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import { useSiteFilter } from '../context/SiteFilterContext';
import { PIPELINE_SITE_ORDER, siteColor } from '../lib/siteColors';

// ⌘K / Ctrl+K command palette (UX spec §6) — the highest-leverage addition
// for daily speed. Fuzzy filter over a seed command list, arrow-key
// navigation, Enter to run, Escape to close. Single-key shortcuts (W/M/H/1-4)
// fire the same commands when no input is focused anywhere on the page.

type Mode = 'list' | 'confirm-pipeline' | 'confirm-push' | 'new-task';

interface Command {
  id:        string;
  label:     string;
  shortcut?: string;
  run:       () => void;
}

// Lightweight subsequence fuzzy match: every query character must appear in
// order in the label. Score rewards tighter, earlier matches.
function fuzzyScore(label: string, query: string): number | null {
  if (!query) return 0;
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  let li = 0;
  let first = -1;
  let last = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = l.indexOf(q[qi], li);
    if (idx === -1) return null;
    if (first === -1) first = idx;
    last = idx;
    li = idx + 1;
  }
  return (last - first) + first * 0.1;
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

export default function CommandPalette() {
  const { week } = useWeek();
  const { setSiteId } = useSiteFilter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [query, setQuery] = useState('');
  const [taskText, setTaskText] = useState('');
  const [selected, setSelected] = useState(0);
  const [busyMsg, setBusyMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setMode('list');
    setQuery('');
    setTaskText('');
    setBusyMsg('');
    setSelected(0);
  }, []);

  const runPipeline = useCallback(async () => {
    setBusyMsg('Triggering pipeline…');
    try {
      const res = await fetch('/api/pipeline', { method: 'POST' });
      const json = await res.json();
      setBusyMsg(json.ok ? 'Pipeline triggered.' : `Could not trigger: ${json.reason ?? 'unknown error'}`);
    } catch {
      setBusyMsg('Could not reach the trigger endpoint.');
    }
    setTimeout(close, 1500);
  }, [close]);

  const runPush = useCallback(async () => {
    setBusyMsg('Pushing approved posts…');
    try {
      const res = await fetch('/api/review/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week }),
      });
      const json = await res.json();
      setBusyMsg(res.ok ? `Pushed ${json.pushed ?? 0}, failed ${json.failed ?? 0}, skipped ${json.skipped ?? 0}.` : (json.error ?? 'Push failed'));
    } catch {
      setBusyMsg('Could not reach the push endpoint.');
    }
    setTimeout(close, 2000);
  }, [week, close]);

  const submitTask = useCallback(async () => {
    const text = taskText.trim();
    if (!text) return;
    setBusyMsg('Saving…');
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: text, status: 'in_progress' }),
      });
      setBusyMsg(res.ok ? 'Task added.' : 'Could not save task.');
    } catch {
      setBusyMsg('Could not save task.');
    }
    setTimeout(close, 1000);
  }, [taskText, close]);

  const commands: Command[] = useMemo(() => [
    { id: 'view-week',  label: 'Open week view',  shortcut: 'W', run: () => { window.location.href = '/library?view=week'; } },
    { id: 'view-month', label: 'Open month view', shortcut: 'M', run: () => { window.location.href = '/library?view=month'; } },
    { id: 'view-home',  label: 'Open home',       shortcut: 'H', run: () => { window.location.href = '/'; } },
    ...PIPELINE_SITE_ORDER.map((id, i) => ({
      id: `filter-${id}`,
      label: `Filter by ${siteColor(id).name}`,
      shortcut: String(i + 1),
      run: () => { setSiteId(id); close(); },
    })),
    { id: 'run-pipeline', label: 'Run content pipeline',      run: () => setMode('confirm-pipeline') },
    { id: 'push-blotato', label: 'Push approved to Blotato',  run: () => setMode('confirm-push') },
    { id: 'new-task',     label: 'New task',                 run: () => setMode('new-task') },
    { id: 'review-queue', label: 'Open review queue',         run: () => { window.location.href = `/review?week=${week}`; } },
  ], [setSiteId, close, week]);

  const filtered = useMemo(() => {
    if (!query) return commands.map(c => ({ c, score: 0 }));
    return commands
      .map(c => ({ c, score: fuzzyScore(c.label, query) }))
      .filter((r): r is { c: Command; score: number } => r.score !== null)
      .sort((a, b) => a.score - b.score);
  }, [commands, query]);

  function onQueryChange(value: string) {
    setQuery(value);
    setSelected(0);
  }

  // Global key handling: ⌘K/Ctrl+K toggles; single-key shortcuts fire when
  // nothing is focused; palette-local nav once open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }

      if (!open) {
        if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(document.activeElement)) return;
        const key = e.key.toLowerCase();
        if (key === 'w') { window.location.href = '/library?view=week'; return; }
        if (key === 'm') { window.location.href = '/library?view=month'; return; }
        if (key === 'h') { window.location.href = '/'; return; }
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1) { setSiteId(PIPELINE_SITE_ORDER[idx]); return; }
        return;
      }

      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (mode !== 'list') return; // confirm/new-task screens handle their own Enter
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); filtered[selected]?.c.run(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, mode, filtered, selected, close, setSiteId]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, mode]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl"
        style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {mode === 'list' && (
          <>
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Type a command…"
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ background: 'transparent', color: 'var(--fg)', borderBottom: '1px solid var(--line)' }}
            />
            <div className="max-h-80 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-sm" style={{ color: 'var(--fg-3)' }}>No matching commands.</p>
              )}
              {filtered.map(({ c }, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => c.run()}
                  onMouseEnter={() => setSelected(i)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm"
                  style={i === selected ? { background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)' } : { color: 'var(--fg-2)' }}
                >
                  <span>{c.label}</span>
                  {c.shortcut && (
                    <span className="mono-num text-[12px]" style={{ color: 'var(--fg-3)' }}>{c.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {(mode === 'confirm-pipeline' || mode === 'confirm-push') && (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm" style={{ color: 'var(--fg)' }}>
              {mode === 'confirm-pipeline'
                ? 'Trigger this week’s content pipeline run?'
                : `Push approved posts to Blotato for week ${week}?`}
            </p>
            {busyMsg ? (
              <p className="text-xs" style={{ color: 'var(--fg-2)' }}>{busyMsg}</p>
            ) : (
              <div className="flex gap-2">
                <button
                  autoFocus
                  onClick={mode === 'confirm-pipeline' ? runPipeline : runPush}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'confirm-pipeline' ? runPipeline() : runPush())}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'var(--hub-accent)', color: 'var(--hub-accent-ink)' }}
                >
                  Yes, go
                </button>
                <button
                  onClick={close}
                  className="rounded-lg px-3 py-1.5 text-xs"
                  style={{ background: 'var(--panel-2)', color: 'var(--fg-2)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'new-task' && (
          <div className="flex flex-col gap-2 p-4">
            <input
              ref={inputRef}
              value={taskText}
              onChange={e => setTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitTask(); if (e.key === 'Escape') close(); }}
              placeholder="Task description…"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
            />
            {busyMsg && <p className="text-xs" style={{ color: 'var(--fg-2)' }}>{busyMsg}</p>}
            <p className="text-[13px]" style={{ color: 'var(--fg-3)' }}>Enter to save · Escape to cancel</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 text-[12px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--fg-3)' }}>
          <span>↑↓ navigate · ↵ run · esc close</span>
          <span className="mono-num">⌘K</span>
        </div>
      </div>
    </div>
  );
}
