'use client';

import { useEffect, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import WeekSelector from '../components/WeekSelector';
import Link from 'next/link';

interface Pillar {
  id:          string;
  name:        string;
  description: string;
}

interface SiteWeeklyPlan {
  pillarId: string;
  theme:    string;
  notes?:   string;
}

interface CoordinatorData {
  weekCommencing:    string;
  campaignObjective?: string | null;
  sites:             Record<string, SiteWeeklyPlan>;
}

type PillarsData = Record<string, Pillar[]>;

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
};

const SITE_ORDER = [
  'masteryourcareerpath',
  'oldoaktown',
  'aiviralvideoprompts',
];

export default function PlanPage() {
  const { week }                                = useWeek();
  const [coordinator, setCoordinator]           = useState<CoordinatorData | null>(null);
  const [pillars, setPillars]                   = useState<PillarsData>({});
  const [form, setForm]                         = useState<CoordinatorData | null>(null);
  const [briefs, setBriefs]                     = useState<Record<string, string>>({});
  const [status, setStatus]                     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg]                 = useState('');
  const [busy, setBusy]                         = useState<string | null>(null);
  const [researchError, setResearchError]       = useState<Record<string, string>>({});
  const [researchNote, setResearchNote]         = useState<Record<string, string>>({});

  // Reload the plan, pillars and research briefs whenever the shared week
  // changes (WeekContext — UX spec §5). The API falls back to the latest
  // existing plan as a template when nothing is saved for this exact week yet,
  // so weekCommencing is always forced back to the one actually selected.
  useEffect(() => {
    fetch(`/api/plan?week=${week}`)
      .then(r => r.json())
      .then(data => {
        setCoordinator(data.coordinator);
        setPillars(data.pillars);
        setBriefs(data.briefs ?? {});
        const fresh = JSON.parse(JSON.stringify(data.coordinator));
        fresh.weekCommencing = week;
        setForm(fresh);
      })
      .catch(() => setErrorMsg('Could not load plan data.'));
  }, [week]);

  function handlePillarChange(siteId: string, pillarId: string) {
    if (!form || !pillars[siteId]) return;
    const pillar = pillars[siteId].find(p => p.id === pillarId);
    if (!pillar) return;
    setForm(prev => prev ? {
      ...prev,
      sites: {
        ...prev.sites,
        [siteId]: {
          ...prev.sites[siteId],
          pillarId,
          theme: pillar.name + ' — ' + pillar.description,
        },
      },
    } : prev);
  }

  function handleThemeEdit(siteId: string, theme: string) {
    setForm(prev => prev ? {
      ...prev,
      sites: {
        ...prev.sites,
        [siteId]: { ...prev.sites[siteId], theme },
      },
    } : prev);
  }

  function handleNotesEdit(siteId: string, notes: string) {
    setForm(prev => prev ? {
      ...prev,
      sites: {
        ...prev.sites,
        [siteId]: { ...prev.sites[siteId], notes },
      },
    } : prev);
  }

  async function handleSave() {
    if (!form) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setCoordinator(form);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  async function generateBrief(siteId: string) {
    const week = form?.weekCommencing;
    if (!week) return;
    if ((briefs[siteId] ?? '').trim() && !window.confirm('Replace the current research brief with a freshly generated one?')) {
      return;
    }
    setBusy(`research-${siteId}`);
    setResearchError(prev => ({ ...prev, [siteId]: '' }));
    setResearchNote(prev => ({ ...prev, [siteId]: '' }));
    try {
      const res = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siteId, week, action: 'generate' }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'out_of_credits') {
          throw new Error("Out of Anthropic credits, and the Blotato and Perplexity fallbacks couldn't complete either — write the brief yourself below, or paste research from another tool (ChatGPT, Perplexity, Gemini).");
        }
        throw new Error(data.error || 'Research generation failed');
      }
      setBriefs(prev => ({ ...prev, [siteId]: data.brief ?? '' }));
      const fallbackNote: Record<string, string> = {
        blotato_perplexity_fallback: "Generated via Blotato's Perplexity research — Anthropic credits were unavailable. Worth a skim before relying on it.",
        perplexity_api_fallback: "Generated via the Perplexity API fallback — Anthropic and Blotato credits were unavailable. Worth a skim before relying on it.",
      };
      setResearchNote(prev => ({ ...prev, [siteId]: fallbackNote[data.source] ?? '' }));
    } catch (err) {
      setResearchError(prev => ({ ...prev, [siteId]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(null);
    }
  }

  async function saveBrief(siteId: string) {
    const week = form?.weekCommencing;
    if (!week) return;
    setBusy(`save-research-${siteId}`);
    setResearchError(prev => ({ ...prev, [siteId]: '' }));
    try {
      const res = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ siteId, week, action: 'save', brief: briefs[siteId] ?? '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
    } catch (err) {
      setResearchError(prev => ({ ...prev, [siteId]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(null);
    }
  }

  if (errorMsg && !form) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="bg-bad/15 border border-bad/60 rounded-lg p-6 max-w-md text-center">
          <p className="text-bad font-medium">Could not load plan</p>
          <p className="text-fg-2 text-sm mt-2">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <p className="text-fg-2">Loading plan…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-fg-2 hover:text-fg text-sm">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-fg">Weekly Content Plan</h1>
        </div>
        <div className="flex items-center gap-3">
          <WeekSelector />
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === 'saved'
                ? 'bg-ok text-on-solid'
                : status === 'error'
                ? 'bg-bad text-on-solid'
                : 'bg-accent hover:brightness-125 text-on-solid disabled:opacity-50'
            }`}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : status === 'error' ? 'Error — retry' : 'Save Plan'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Campaign objective */}
        <div className="bg-panel border border-line-2 rounded-xl p-5">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex-[2] min-w-64">
              <label className="block text-xs font-medium text-fg-2 mb-1 uppercase tracking-wide">Campaign objective (optional)</label>
              <input
                type="text"
                value={form.campaignObjective ?? ''}
                onChange={e => setForm(prev => prev ? { ...prev, campaignObjective: e.target.value || null } : prev)}
                placeholder="e.g. OPERATE launch week, cohort open enrolment…"
                className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-accent/70 placeholder-fg-3"
              />
            </div>
          </div>
        </div>

        {/* Per-site theme cards */}
        {SITE_ORDER.map(siteId => {
          const sitePlan    = form.sites[siteId] ?? { pillarId: '', theme: '', notes: '' };
          const sitePillars = pillars[siteId] ?? [];

          return (
            <div key={siteId} className="bg-panel border border-line-2 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-fg">{SITE_LABELS[siteId] ?? siteId}</h2>

              {/* Research brief for the selected week — generatable + editable */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-fg-2 uppercase tracking-wide">Research brief for this week</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateBrief(siteId)}
                      disabled={busy !== null}
                      className="rounded-lg bg-accent hover:brightness-125 text-on-solid px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      title="Search the web for what's actually happening right now, relevant to this site's audience"
                    >
                      {busy === `research-${siteId}` ? 'Researching…' : '🔎 Generate research brief'}
                    </button>
                    <button
                      onClick={() => saveBrief(siteId)}
                      disabled={busy !== null}
                      className="rounded-lg bg-panel-3 hover:brightness-125 text-fg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      {busy === `save-research-${siteId}` ? 'Saving…' : 'Save brief'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={briefs[siteId] ?? ''}
                  onChange={e => setBriefs(prev => ({ ...prev, [siteId]: e.target.value }))}
                  rows={6}
                  placeholder="Hit 🔎 Generate research brief to search the web for what's happening this week for this audience — or write the brief yourself. It feeds this week's content pipeline."
                  className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-xs focus:outline-none focus:border-accent/70 font-sans leading-relaxed whitespace-pre-wrap"
                />
                {researchError[siteId] && (
                  <p className="text-xs text-bad">{researchError[siteId]}</p>
                )}
                {researchNote[siteId] && (
                  <p className="text-xs text-warn">{researchNote[siteId]}</p>
                )}
              </div>

              {/* Pillar selector */}
              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1 uppercase tracking-wide">Content pillar</label>
                <select
                  value={sitePlan.pillarId}
                  onChange={e => handlePillarChange(siteId, e.target.value)}
                  className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-accent/70"
                >
                  <option value="">— select pillar —</option>
                  {sitePillars.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {sitePlan.pillarId && sitePillars.find(p => p.id === sitePlan.pillarId) && (
                  <p className="text-xs text-fg-3 mt-1">
                    {sitePillars.find(p => p.id === sitePlan.pillarId)?.description}
                  </p>
                )}
              </div>

              {/* Theme (editable — auto-filled from pillar, can override) */}
              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1 uppercase tracking-wide">
                  Theme for this week <span className="text-fg-3 normal-case">(auto-filled from pillar — edit to focus further)</span>
                </label>
                <input
                  type="text"
                  value={sitePlan.theme}
                  onChange={e => handleThemeEdit(siteId, e.target.value)}
                  placeholder="Select a pillar above, or type a custom theme"
                  className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-accent/70 placeholder-fg-3"
                />
              </div>

              {/* Optional notes */}
              <div>
                <label className="block text-xs font-medium text-fg-2 mb-1 uppercase tracking-wide">Notes (optional)</label>
                <input
                  type="text"
                  value={sitePlan.notes ?? ''}
                  onChange={e => handleNotesEdit(siteId, e.target.value)}
                  placeholder="e.g. focus on graduates this week, mention the cohort opening"
                  className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-accent/70 placeholder-fg-3"
                />
              </div>
            </div>
          );
        })}

        {/* Error message */}
        {status === 'error' && errorMsg && (
          <div className="bg-bad/15 border border-bad/60 rounded-lg p-4">
            <p className="text-bad text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Instruction */}
        <div className="bg-panel border border-line-2 rounded-xl p-5 text-sm text-fg-2 space-y-1">
          <p className="text-fg font-medium">After saving</p>
          <p>Run the weekly pipeline to generate this week&apos;s drafts — 5 per site (Monday–Friday). Drafts appear in the <a href="/review" className="text-accent-text hover:text-accent-text underline">Review</a> queue, where you edit, approve, and push approved posts to Blotato.</p>
        </div>
      </div>
    </div>
  );
}
