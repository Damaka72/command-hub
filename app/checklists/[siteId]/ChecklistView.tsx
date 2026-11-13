'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { updateChecklistItem } from '../actions';
import {
  AUTO_CHECKS, CHECKLIST_STATUSES, OWNER_LABELS, STATUS_LABELS, byPhase, isComplete, nextAction, progressOf, waitingOn,
  type ChecklistFile, type ChecklistItem, type ChecklistStatus,
} from '@/app/lib/checklistLogic';

const GLYPH: Record<ChecklistStatus, string> = { todo: '○', in_progress: '◐', done: '✓', blocked: '⛔', not_needed: '–' };
const COLOR: Record<ChecklistStatus, string> = { todo: 'var(--fg-2)', in_progress: 'var(--info)', done: 'var(--ok)', blocked: 'var(--bad)', not_needed: 'var(--fg-3)' };

type Local = Record<string, Partial<Pick<ChecklistItem, 'status' | 'blocked_reason' | 'notes' | 'secrets_set'>>>;
const localKey = (siteId: string) => `hub:checklist:${siteId}`;
const readLocal = (siteId: string): Local => { try { return JSON.parse(localStorage.getItem(localKey(siteId)) ?? '{}'); } catch { return {}; } };
const writeLocal = (siteId: string, v: Local) => { try { localStorage.setItem(localKey(siteId), JSON.stringify(v)); } catch { /* not kept */ } };

export default function ChecklistView({ initial, persistence, autoPassed }: { initial: ChecklistFile; persistence: 'saved' | 'unavailable'; autoPassed: string[] }) {
  // If the shared store is unavailable, this device's own saved changes are laid over the file.
  const [file, setFile] = useState<ChecklistFile>(() => {
    if (persistence === 'saved' || typeof window === 'undefined') return initial;
    const local = readLocal(initial.siteId);
    return { ...initial, items: initial.items.map(i => ({ ...i, ...local[i.id] })) };
  });
  const [deviceOnly, setDeviceOnly] = useState(persistence === 'unavailable');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [, start] = useTransition();

  const overall = progressOf(file.items);
  const next = useMemo(() => nextAction(file.items), [file.items]);
  const phases = useMemo(() => byPhase(file), [file]);

  function change(item: ChecklistItem, patch: Partial<Pick<ChecklistItem, 'status' | 'blocked_reason' | 'notes' | 'secrets_set'>>) {
    const merged = { ...item, ...patch };
    start(async () => {
      const r = await updateChecklistItem(file.siteId, item.id, {
        status: merged.status, blocked_reason: merged.blocked_reason, notes: merged.notes, secrets_set: merged.secrets_set,
      });
      if (!r.ok) { setMessage(r.error); return; }
      setMessage('');
      setFile(f => ({ ...f, items: f.items.map(i => (i.id === item.id ? { ...merged, blocked_reason: merged.status === 'blocked' ? merged.blocked_reason : undefined, updated_at: r.updated_at } : i)) }));
      if (!r.saved) {
        setDeviceOnly(true);
        const local = readLocal(file.siteId);
        local[item.id] = { status: merged.status, blocked_reason: merged.blocked_reason, notes: merged.notes, secrets_set: merged.secrets_set };
        writeLocal(file.siteId, local);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-5 py-6" style={{ gap: 'var(--space-section)' }}>
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-text)' }}>← Command Hub</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--fg)' }}>{file.name}: launch setup checklist</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>
          Everything to set up before and after launch, who does it, and what is done. Never paste keys or passwords here: this list records only whether something is set.
        </p>
      </div>

      {deviceOnly && (
        <p role="status" className="p-4 text-sm" style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-control)' }}>
          <strong style={{ color: 'var(--warn)' }}>Saved on this device only.</strong> The shared store is not set up yet (see item C7), so changes stay in this browser until it is.
        </p>
      )}
      {message && <p role="alert" className="p-3 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{message}</p>}

      <section aria-labelledby="overall-h" className="p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-card)' }}>
        <h2 id="overall-h" className="text-sm font-semibold" style={{ color: 'var(--fg-2)' }}>Overall progress</h2>
        <p className="mono-num mt-1 text-3xl font-semibold" style={{ color: 'var(--fg)' }}>{overall.complete} of {overall.total} done</p>
        <Bar done={overall.complete} total={overall.total} label="Overall" />
        {overall.blocked > 0 && <p className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>{overall.blocked} blocked</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {phases.map(p => (
            <a key={p.phase.id} href={`#phase-${p.phase.id}`} className="block text-sm no-underline" style={{ color: 'var(--fg-2)' }}>
              <span style={{ color: 'var(--fg)' }}>{p.phase.id}. {p.phase.title}</span> · {p.complete} of {p.total}
              <Bar done={p.complete} total={p.total} label={p.phase.title} height={4} />
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="next-h" className="p-5" style={{ background: 'var(--panel-2)', border: '2px solid var(--accent)', borderRadius: 'var(--radius-card)' }}>
        <h2 id="next-h" className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>Next action</h2>
        {next ? (
          <>
            <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--fg)' }}>{next.id}: {next.title}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--fg-2)' }}>Owner: {OWNER_LABELS[next.owner]}. {next.instructions}</p>
            {next.status === 'blocked' && <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--bad)' }}>Blocked: {next.blocked_reason}</p>}
            <a href={`#item-${next.id}`} onClick={() => setOpen(next.id)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }}>Go to this item ↓</a>
          </>
        ) : <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--ok)' }}>Everything is done.</p>}
      </section>

      {phases.map(p => (
        <section key={p.phase.id} id={`phase-${p.phase.id}`} aria-labelledby={`h-${p.phase.id}`} className="scroll-mt-4">
          <h2 id={`h-${p.phase.id}`} className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Phase {p.phase.id}: {p.phase.title}</h2>
          <p className="mono-num text-sm" style={{ color: 'var(--fg-2)' }}>{p.complete} of {p.total} done</p>
          <ul className="mt-3 flex flex-col gap-2">
            {p.items.map(item => (
              <Item key={item.id} item={item} all={file.items} isNext={next?.id === item.id} expanded={open === item.id}
                onToggle={() => setOpen(open === item.id ? null : item.id)} change={change} auto={item.auto_check ? autoPassed.includes(item.auto_check) : null} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Bar({ done, total, label, height = 6 }: { done: number; total: number; label: string; height?: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div role="progressbar" aria-label={`${label}: ${done} of ${total} done`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      className="mt-2 w-full overflow-hidden" style={{ height, borderRadius: height, background: 'var(--panel-3)' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ok)' }} />
    </div>
  );
}

function Item({ item, all, isNext, expanded, onToggle, change, auto }: {
  item: ChecklistItem; all: ChecklistItem[]; isNext: boolean; expanded: boolean; onToggle: () => void;
  change: (i: ChecklistItem, p: Partial<Pick<ChecklistItem, 'status' | 'blocked_reason' | 'notes' | 'secrets_set'>>) => void; auto: boolean | null;
}) {
  const waiting = waitingOn(item, all);
  const [reason, setReason] = useState(item.blocked_reason ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const dimmed = waiting.length > 0 && !isComplete(item);
  return (
    <li id={`item-${item.id}`} className="p-4" style={{ background: 'var(--panel)', border: `1px solid ${isNext ? 'var(--accent)' : 'var(--line-2)'}`, borderRadius: 'var(--radius-card)', opacity: dimmed ? 0.75 : 1 }}>
      <button onClick={onToggle} aria-expanded={expanded} className="flex min-h-11 w-full items-start gap-3 text-left">
        <span aria-hidden="true" style={{ color: COLOR[item.status], fontSize: 18 }}>{GLYPH[item.status]}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: 'var(--fg)' }}><span className="mono-num" style={{ color: 'var(--fg-2)' }}>{item.id}</span> {item.title}</span>
          <span className="block text-xs" style={{ color: 'var(--fg-2)' }}>
            {STATUS_LABELS[item.status]} · {OWNER_LABELS[item.owner]}
            {auto && <span title={AUTO_CHECKS[item.auto_check!]?.label} style={{ color: 'var(--ok)' }}> · ✓ auto-checked</span>}
            {waiting.length > 0 && !isComplete(item) && <> · waiting for {waiting.map(w => w.id).join(', ')}</>}
          </span>
          {item.status === 'blocked' && item.blocked_reason && <span className="mt-1 block text-xs" style={{ color: 'var(--bad)' }}>Blocked: {item.blocked_reason}</span>}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 flex flex-col gap-3 text-sm" style={{ color: 'var(--fg)' }}>
          <p>{item.instructions}</p>
          {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline" style={{ color: 'var(--accent-text)' }}>Open the page to use ↗</a>}
          {item.secret_names && item.secret_names.length > 0 && (
            <fieldset>
              <legend className="mb-1 text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>Is each one set? (yes or no only, never the value)</legend>
              <div className="flex flex-col">
                {item.secret_names.map(n => {
                  const set = (item.secrets_set ?? []).includes(n);
                  return (
                    <label key={n} className="flex min-h-11 items-center gap-3">
                      <input type="checkbox" checked={set} className="h-5 w-5" onChange={e => change(item, { secrets_set: e.target.checked ? [...(item.secrets_set ?? []), n] : (item.secrets_set ?? []).filter(x => x !== n) })} />
                      <code className="break-all">{n}</code> <span style={{ color: set ? 'var(--ok)' : 'var(--fg-2)' }}>{set ? 'set' : 'not set'}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={`st-${item.id}`} className="mb-1 block text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>Status</label>
              <select id={`st-${item.id}`} value={item.status} onChange={e => change(item, { status: e.target.value as ChecklistStatus, blocked_reason: e.target.value === 'blocked' ? reason : undefined })}
                className="min-h-11 px-3" style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-control)' }}>
                {CHECKLIST_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {!isComplete(item) && item.status !== 'done' && (
              <button onClick={() => change(item, { status: 'done' })} className="min-h-11 px-4 text-sm font-semibold" style={{ background: 'var(--ok)', color: 'var(--on-solid)', borderRadius: 'var(--radius-control)' }}>Mark done</button>
            )}
          </div>
          {item.status === 'blocked' && (
            <div>
              <label htmlFor={`br-${item.id}`} className="mb-1 block text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>Why is it blocked?</label>
              <input id={`br-${item.id}`} value={reason} onChange={e => setReason(e.target.value)} onBlur={() => reason !== (item.blocked_reason ?? '') && change(item, { blocked_reason: reason })}
                className="min-h-11 w-full px-3" style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-control)' }} />
            </div>
          )}
          <div>
            <label htmlFor={`nt-${item.id}`} className="mb-1 block text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>Notes (never paste keys or passwords)</label>
            <textarea id={`nt-${item.id}`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (item.notes ?? '') && change(item, { notes })}
              className="w-full p-3" style={{ background: 'var(--panel-2)', color: 'var(--fg)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-control)' }} />
          </div>
          {item.updated_at && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Last updated {new Date(item.updated_at).toLocaleString('en-GB')}</p>}
        </div>
      )}
    </li>
  );
}
