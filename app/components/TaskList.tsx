"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ActionLogEntry, ActionsResponse } from "../api/actions/route";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

function toTask(a: ActionLogEntry): Task {
  return { id: a.id, text: a.action, done: a.status === "done" };
}

export default function TaskList({ siteId }: { siteId: string }) {
  const [open,      setOpen]      = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[] | null>(null); // null = not loaded yet
  const [showDone,  setShowDone]  = useState(false);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Backed by the central actions_log table (via /api/actions), which replaces
  // the old localStorage `tasks-${siteId}` store so Cowork / automation and the
  // dashboard share one source of truth. Open tasks (in_progress + blocked) show
  // by default; completed ones are loaded on demand behind the toggle so the
  // widget isn't crowded by automation-logged done items.
  const load = useCallback(() => {
    fetch(`/api/actions?site=${encodeURIComponent(siteId)}&status=open&limit=100`)
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        setOpen(data?.actions ? data.actions.map(toTask) : []);
      })
      .catch(() => setOpen([]))
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  const loadCompleted = useCallback(() => {
    fetch(`/api/actions?site=${encodeURIComponent(siteId)}&status=done&limit=100`)
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        setCompleted(data?.actions ? data.actions.map(toTask) : []);
      })
      .catch(() => setCompleted([]));
  }, [siteId]);

  function toggleShowDone() {
    const next = !showDone;
    setShowDone(next);
    if (next && completed === null) loadCompleted();
  }

  async function addTask() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    inputRef.current?.focus();
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, action: text, status: "in_progress" }),
      });
      const json = await res.json() as { action?: ActionLogEntry };
      if (json.action) setOpen(prev => [toTask(json.action!), ...prev]);
    } catch { /* keep input cleared; a reload will resync */ }
  }

  // Marking a task done moves it from the open list into completed (and vice
  // versa), so the default view only ever shows open work.
  async function setDone(task: Task, done: boolean) {
    const moved: Task = { ...task, done };
    if (done) {
      setOpen(prev => prev.filter(t => t.id !== task.id));
      setCompleted(prev => (prev === null ? prev : [moved, ...prev]));
    } else {
      setCompleted(prev => (prev === null ? prev : prev.filter(t => t.id !== task.id)));
      setOpen(prev => [moved, ...prev]);
    }
    try {
      const res = await fetch("/api/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: done ? "done" : "in_progress" }),
      });
      if (!res.ok) throw new Error("patch failed");
    } catch {
      // revert
      if (done) {
        setCompleted(prev => (prev === null ? prev : prev.filter(t => t.id !== task.id)));
        setOpen(prev => [task, ...prev]);
      } else {
        setOpen(prev => prev.filter(t => t.id !== task.id));
        setCompleted(prev => (prev === null ? prev : [task, ...prev]));
      }
    }
  }

  async function remove(task: Task, from: "open" | "done") {
    if (from === "open") setOpen(prev => prev.filter(t => t.id !== task.id));
    else setCompleted(prev => (prev === null ? prev : prev.filter(t => t.id !== task.id)));
    try {
      const res = await fetch(`/api/actions?id=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      // revert
      if (from === "open") setOpen(prev => [task, ...prev]);
      else setCompleted(prev => (prev === null ? prev : [task, ...prev]));
    }
  }

  const countLabel = loading
    ? 'Loading…'
    : open.length === 0
    ? 'No open tasks'
    : `${open.length} open`;

  const doneCount = completed?.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Tasks
        </span>
        <span className={`text-xs ${open.length === 0 && !loading ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {countLabel}
        </span>
      </div>

      {open.length > 0 && (
        <ul className="flex flex-col gap-1">
          {open.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <input
                type="checkbox"
                checked={false}
                onChange={() => setDone(task, true)}
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
              />
              <span className="flex-1 text-sm leading-snug text-zinc-700 dark:text-zinc-200">
                {task.text}
              </span>
              <button
                onClick={() => remove(task, "open")}
                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-zinc-500 dark:text-zinc-700 dark:hover:text-zinc-400 text-xs leading-none flex-shrink-0 transition-opacity"
                aria-label="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={`task-input-${siteId}`}
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          disabled={loading}
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500 dark:focus:bg-zinc-900"
        />
        <button
          onClick={addTask}
          disabled={!input.trim() || loading}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add
        </button>
      </div>

      {/* Completed — hidden by default, loaded on demand */}
      <div className="flex flex-col gap-1">
        <button
          onClick={toggleShowDone}
          className="self-start text-[13px] font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          {showDone
            ? `▲ Hide completed${doneCount !== undefined ? ` (${doneCount})` : ''}`
            : `▼ Show completed${doneCount !== undefined ? ` (${doneCount})` : ''}`}
        </button>

        {showDone && (
          completed === null ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Loading completed…</p>
          ) : completed.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">No completed tasks yet</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {completed.map(task => (
                <li key={task.id} className="flex items-start gap-2 group">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => setDone(task, false)}
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
                  />
                  <span className="flex-1 text-sm leading-snug line-through text-zinc-400 dark:text-zinc-600">
                    {task.text}
                  </span>
                  <button
                    onClick={() => remove(task, "done")}
                    className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-zinc-500 dark:text-zinc-700 dark:hover:text-zinc-400 text-xs leading-none flex-shrink-0 transition-opacity"
                    aria-label="Delete task"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
