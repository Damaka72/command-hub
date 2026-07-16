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
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Backed by the central actions_log table (via /api/actions), which replaces
  // the old localStorage `tasks-${siteId}` store so Cowork / automation and the
  // dashboard share one source of truth.
  const load = useCallback(() => {
    fetch(`/api/actions?site=${encodeURIComponent(siteId)}&limit=100`)
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        setTasks(data?.actions ? data.actions.map(toTask) : []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

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
      if (json.action) setTasks(prev => [toTask(json.action!), ...prev]);
    } catch { /* keep input cleared; a reload will resync */ }
  }

  async function toggle(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextDone = !task.done;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: nextDone } : t)); // optimistic
    try {
      const res = await fetch("/api/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextDone ? "done" : "in_progress" }),
      });
      if (!res.ok) throw new Error("patch failed");
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: task.done } : t)); // revert
    }
  }

  async function remove(id: string) {
    const prev = tasks;
    setTasks(prev.filter(t => t.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/actions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setTasks(prev); // revert
    }
  }

  const remaining  = tasks.filter(t => !t.done).length;
  const countLabel = loading
    ? 'Loading…'
    : tasks.length === 0
    ? 'No tasks yet'
    : remaining === 0
    ? 'All done ✓'
    : `${remaining} of ${tasks.length} remaining`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Tasks
        </span>
        <span className={`text-xs ${remaining === 0 && tasks.length > 0 ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {countLabel}
        </span>
      </div>

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {tasks.map(task => (
            <li key={task.id} className="flex items-start gap-2 group">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggle(task.id)}
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
              />
              <span className={`flex-1 text-sm leading-snug ${task.done ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-700 dark:text-zinc-200'}`}>
                {task.text}
              </span>
              <button
                onClick={() => remove(task.id)}
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
    </div>
  );
}
