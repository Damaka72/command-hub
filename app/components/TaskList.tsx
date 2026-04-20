"use client";

import { useState, useEffect, useRef } from "react";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function TaskList({ siteId }: { siteId: string }) {
  const storageKey = `tasks-${siteId}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setTasks(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  function save(next: Task[]) {
    setTasks(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function addTask() {
    const text = input.trim();
    if (!text) return;
    save([...tasks, { id: crypto.randomUUID(), text, done: false }]);
    setInput("");
    inputRef.current?.focus();
  }

  function toggle(id: string) {
    save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id: string) {
    save(tasks.filter(t => t.id !== id));
  }

  const remaining = tasks.filter(t => !t.done).length;
  const countLabel = tasks.length === 0
    ? "No tasks yet"
    : remaining === 0
    ? "All done ✓"
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
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500 dark:focus:bg-zinc-900"
        />
        <button
          onClick={addTask}
          disabled={!input.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add
        </button>
      </div>
    </div>
  );
}
