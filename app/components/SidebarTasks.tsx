"use client";

import { useEffect, useState } from "react";
import { SITE_SHORT } from "../lib/siteConstants";
import type { ActionLogEntry, ActionsResponse } from "../api/actions/route";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SidebarTasks() {
  const [tasks, setTasks] = useState<ActionLogEntry[]>([]);

  // Open actions (in_progress + blocked) across every site, from the central
  // actions_log table via /api/actions?status=open — replacing the per-site
  // localStorage `tasks-${siteId}` scan so automation-written items appear too.
  useEffect(() => {
    fetch("/api/actions?status=open&limit=100")
      .then(r => r.ok ? r.json() : null)
      .then((data: ActionsResponse | null) => {
        if (data?.actions) setTasks(data.actions);
      })
      .catch(() => {});
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
          {tasks.map((task) => {
            const tag = task.siteId
              ? SITE_SHORT[task.siteId] ?? task.siteId
              : task.channel
              ? titleCase(task.channel)
              : "General";
            return (
              <li key={task.id} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span className="flex-1 text-xs leading-snug text-zinc-700 dark:text-zinc-200">
                  {task.action}
                </span>
                <span className="flex-shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {tag}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
