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
  Warm:     "bg-warn/15 text-warn",
  Proposal: "bg-accent-dim text-accent-text",
  Active:   "bg-ok/15 text-ok",
  Won:      "font-semibold bg-ok/15 text-ok",
  Lost:     "bg-panel-2 text-fg-3",
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
    <div className="mt-8 rounded-2xl border shadow-sm border-line-2 bg-panel">

      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 border-line">
        <div>
          <h2 className="text-sm font-semibold text-fg">
            Revenue Pipeline · Didi Anolue
          </h2>
          <p className="mt-0.5 text-xs text-fg-2">
            Manual deal tracker — stored locally
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] uppercase tracking-wide text-fg-3">Pipeline total</p>
          <p className="text-lg font-bold text-ok">
            £{pipelineTotal.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="px-6 py-4">

        {/* Deal list */}
        {deals.length === 0 ? (
          <p className="mb-4 text-xs text-fg-3">No deals yet — add one below.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {deals.map(deal => (
              <li
                key={deal.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  deal.stage === "Lost"
                    ? "border-line bg-panel-2/40"
                    : "border-line bg-panel-2/60"
                }`}
              >
                {/* Deal name */}
                <span className={`flex-1 text-sm ${deal.stage === "Lost" ? "line-through text-fg-3" : "text-fg"}`}>
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
                <span className={`w-20 text-right text-sm font-semibold tabular-nums ${deal.stage === "Lost" ? "text-fg-3" : "text-fg"}`}>
                  £{deal.value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeDeal(deal.id)}
                  className="transition-colors text-fg-3 hover:text-fg-2"
                  aria-label="Remove deal"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add deal form */}
        <div className="flex flex-wrap gap-2 border-t pt-4 border-line">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDeal()}
            placeholder="Deal name"
            className="flex-1 min-w-[160px] rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-colors border-line-2 bg-panel-2 text-fg placeholder-fg-3 focus:border-line-2 focus:bg-panel"
          />
          <select
            value={stage}
            onChange={e => setStage(e.target.value as Stage)}
            className="rounded-lg border px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-line-2 border-line-2 bg-panel-2 text-fg"
          >
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-fg-2">£</span>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDeal()}
              placeholder="0"
              min="0"
              className="w-28 rounded-lg border pl-6 pr-2.5 py-1.5 text-sm outline-none transition-colors border-line-2 bg-panel-2 text-fg placeholder-fg-3 focus:border-line-2 focus:bg-panel"
            />
          </div>
          <button
            onClick={addDeal}
            disabled={!name.trim() || !value}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 bg-fg text-bg hover:brightness-125"
          >
            Add deal
          </button>
        </div>
      </div>
    </div>
  );
}
