"use client";

import { useEffect, useState } from "react";

type Stage = "Warm" | "Proposal" | "Active" | "Won" | "Lost";

interface Deal {
  id: string;
  name: string;
  stage: Stage;
  value: number;
}

const STAGES: Stage[] = ["Warm", "Proposal", "Active", "Won", "Lost"];

const STAGE_STYLES: Record<Stage, string> = {
  Warm:     "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Proposal: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Active:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Won:      "bg-emerald-200 text-emerald-800 font-semibold dark:bg-emerald-900/60 dark:text-emerald-200",
  Lost:     "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

const STORAGE_KEY = "hub-didi-pipeline";

function load(): Deal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

function persist(deals: Deal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

export default function DiPipeline() {
  const [deals,    setDeals]    = useState<Deal[]>([]);
  const [name,     setName]     = useState("");
  const [stage,    setStage]    = useState<Stage>("Warm");
  const [value,    setValue]    = useState("");
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setDeals(load());
    setMounted(true);
  }, []);

  function save(next: Deal[]) {
    setDeals(next);
    persist(next);
  }

  function addDeal() {
    const n = name.trim();
    const v = parseFloat(value);
    if (!n || isNaN(v) || v < 0) return;
    save([...deals, { id: crypto.randomUUID(), name: n, stage, value: v }]);
    setName("");
    setValue("");
    setStage("Warm");
  }

  function updateStage(id: string, s: Stage) {
    save(deals.map(d => d.id === id ? { ...d, stage: s } : d));
  }

  function removeDeal(id: string) {
    save(deals.filter(d => d.id !== id));
  }

  const pipelineTotal = deals
    .filter(d => d.stage !== "Lost")
    .reduce((sum, d) => sum + d.value, 0);

  if (!mounted) return null;

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Revenue Pipeline · Didi Anolue
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Manual deal tracker — stored locally
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Pipeline total</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            £{pipelineTotal.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* Deal list */}
        {deals.length === 0 ? (
          <p className="mb-4 text-xs text-zinc-400 dark:text-zinc-500">No deals yet — add one below.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {deals.map(deal => (
              <li
                key={deal.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  deal.stage === "Lost"
                    ? "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40"
                    : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60"
                }`}
              >
                {/* Deal name */}
                <span className={`flex-1 text-sm ${deal.stage === "Lost" ? "text-zinc-400 line-through dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {deal.name}
                </span>

                {/* Stage dropdown */}
                <select
                  value={deal.stage}
                  onChange={e => updateStage(deal.id, e.target.value as Stage)}
                  className={`rounded-full px-2 py-0.5 text-[13px] font-medium border-0 outline-none cursor-pointer ${STAGE_STYLES[deal.stage]}`}
                >
                  {STAGES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Value */}
                <span className={`w-20 text-right text-sm font-semibold tabular-nums ${deal.stage === "Lost" ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-300"}`}>
                  £{deal.value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeDeal(deal.id)}
                  className="text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-700 dark:hover:text-zinc-400"
                  aria-label="Remove deal"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add deal form */}
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDeal()}
            placeholder="Deal name"
            className="flex-1 min-w-[160px] rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500 dark:focus:bg-zinc-900"
          />
          <select
            value={stage}
            onChange={e => setStage(e.target.value as Stage)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">£</span>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDeal()}
              placeholder="0"
              min="0"
              className="w-28 rounded-lg border border-zinc-200 bg-zinc-50 pl-6 pr-2.5 py-1.5 text-sm text-zinc-700 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-400 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:border-zinc-500 dark:focus:bg-zinc-900"
            />
          </div>
          <button
            onClick={addDeal}
            disabled={!name.trim() || !value}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Add deal
          </button>
        </div>
      </div>
    </div>
  );
}
