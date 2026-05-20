"use client";

import { useEffect, useState } from "react";
import { SITE_SHORT } from "../lib/siteConstants";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

interface FlatTask extends Task {
  siteId: string;
}

const SITE_IDS = [
  "oldoaktown",
  "theconcurrentcontractor",
  "masteryourcareerpath",
  "aiviralvideoprompts",
  "didianolue",
];

export default function SidebarTasks() {
  const [tasks, setTasks] = useState<FlatTask[]>([]);

  useEffect(() => {
    const all: FlatTask[] = [];
    for (const siteId of SITE_IDS) {
      try {
        const stored = localStorage.getItem(`tasks-${siteId}`);
        if (stored) {
          const parsed: Task[] = JSON.parse(stored);
          for (const t of parsed) {
            if (!t.done) all.push({ ...t, siteId });
          }
        }
      } catch {}
    }
    setTasks(all);
  }, []);

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 p-4 dark:border-zinc-800">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        All Tasks
      </span>
      {tasks.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No incomplete tasks</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <li
              key={`${task.siteId}-${task.id}`}
              className="flex items-start gap-2"
            >
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <span className="flex-1 text-xs leading-snug text-zinc-700 dark:text-zinc-200">
                {task.text}
              </span>
              <span className="flex-shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {SITE_SHORT[task.siteId] ?? task.siteId}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
