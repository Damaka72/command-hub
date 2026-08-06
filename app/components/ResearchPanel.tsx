"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_CONFIGS } from "@/agents/site-configs";

// Returns the date string (YYYY-MM-DD) for the next Monday from today —
// matches the default week /plan uses, so a brief generated here is the
// same one /plan (and the pipeline) will pick up.
function nextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

function SiteRow({ siteId, name, week, brief, onChange }: {
  siteId: string;
  name: string;
  week: string;
  brief: string;
  onChange: (siteId: string, brief: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasBrief = brief.trim().length > 0;

  async function generate() {
    if (hasBrief && !window.confirm(`Replace the current research brief for ${name} with a freshly generated one?`)) {
      return;
    }
    setBusy('generate');
    setError(null);
    try {
      const res = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siteId, week, action: 'generate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Research generation failed');
      onChange(siteId, data.brief ?? '');
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy('save');
    setError(null);
    try {
      const res = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siteId, week, action: 'save', brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg" style={{ background: 'var(--hub-surface-2)', border: '1px solid var(--hub-border)' }}>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: hasBrief ? '#34d399' : 'var(--hub-text-3)' }}
          />
          <span className="truncate text-xs font-medium" style={{ color: 'var(--hub-text-1)' }}>{name}</span>
          <span className="shrink-0 text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            {hasBrief ? 'researched' : 'not researched'}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={generate}
            disabled={busy !== null}
            className="rounded-lg px-2.5 py-1 text-[13px] font-medium transition-all hover:brightness-125 disabled:opacity-50"
            style={{ background: 'rgba(168,85,247,0.12)', color: '#c4b5fd', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            {busy === 'generate' ? 'Researching…' : hasBrief ? '🔎 Regenerate' : '🔎 Generate'}
          </button>
          <button onClick={() => setOpen(o => !o)} className="text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 px-3 pb-3" style={{ borderTop: '1px solid var(--hub-border)' }}>
          <textarea
            value={brief}
            onChange={e => onChange(siteId, e.target.value)}
            rows={6}
            placeholder="Hit 🔎 Generate to search the web for what's happening this week for this audience — or write the brief yourself."
            className="mt-2 w-full rounded-lg px-3 py-2 text-xs leading-relaxed focus:outline-none"
            style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border)', color: 'var(--hub-text-1)' }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={busy !== null}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all hover:brightness-125 disabled:opacity-50"
              style={{ background: 'var(--hub-surface)', color: 'var(--hub-text-2)', border: '1px solid var(--hub-border)' }}
            >
              {busy === 'save' ? 'Saving…' : 'Save brief'}
            </button>
            {error && <span className="text-[13px]" style={{ color: '#f87171' }}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPanel() {
  const [week] = useState(nextMonday);
  const [briefs, setBriefs] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/plan?week=${week}`)
      .then(r => r.json())
      .then(data => setBriefs(data.briefs ?? {}))
      .catch(() => setBriefs({}))
      .finally(() => setLoaded(true));
  }, [week]);

  useEffect(() => { load(); }, [load]);

  const researchedCount = SITE_CONFIGS.filter(s => (briefs[s.id] ?? '').trim().length > 0).length;

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--hub-surface)', border: '1px solid var(--hub-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--hub-text-1)' }}>Research</h2>
          <p className="text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
            Ground next week&rsquo;s content in what&rsquo;s actually happening — search the web per site before running the pipeline
          </p>
        </div>
        <span className="shrink-0 text-[13px]" style={{ color: researchedCount === SITE_CONFIGS.length ? '#34d399' : 'var(--hub-text-3)' }}>
          {loaded ? `${researchedCount}/${SITE_CONFIGS.length} researched` : '…'}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {SITE_CONFIGS.map(site => (
          <SiteRow
            key={site.id}
            siteId={site.id}
            name={site.name}
            week={week}
            brief={briefs[site.id] ?? ''}
            onChange={(siteId, brief) => setBriefs(prev => ({ ...prev, [siteId]: brief }))}
          />
        ))}
      </div>

      <p className="mt-3 text-[13px]" style={{ color: 'var(--hub-text-3)' }}>
        Week commencing {week} — same week /plan defaults to. Briefs saved here feed straight into the pipeline.
      </p>
    </section>
  );
}
