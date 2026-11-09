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
  const [pillars, setPillars]                   = useState<PillarsData>({});
  const [form, setForm]                         = useState<CoordinatorData | null>(null);
  const [briefs, setBriefs]                     = useState<Record<string, string>>({});
  const [status, setStatus]                     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg]                 = useState('');

  // Reload the plan, pillars and research briefs whenever the shared week
  // changes (WeekContext — UX spec §5). The API falls back to the latest
  // existing plan as a template when nothing is saved for this exact week yet,
  // so weekCommencing is always forced back to the one actually selected.
  useEffect(() => {
    fetch(`/api/plan?week=${week}`)
      .then(r => r.json())
      .then(data => {
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
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
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
          <h1 className="text-lg font-semibold text-fg">Weekly focus</h1>
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
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : status === 'error' ? 'Error — retry' : 'Save focus'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-panel border border-line-2 rounded-xl p-5 text-sm text-fg-2 space-y-1">
          <p className="text-fg font-medium">This is where you steer the week</p>
          <p>
            Cowork researches and drafts on its own every Saturday at 06:55. Set a pillar, a theme or a note here
            for anything you want it to put extra attention on in the focus posts. Leave a site blank and Cowork
            chooses. Save before Saturday 06:55.
          </p>
        </div>

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

              {/* Research brief for the selected week: written by Cowork, read-only here */}
              <details className="rounded-lg border border-line-2 bg-panel-2">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-fg-2 uppercase tracking-wide">
                  Cowork&apos;s research brief for this week {briefs[siteId] ? '' : '(none yet)'}
                </summary>
                <div className="px-3 pb-3">
                  {briefs[siteId] ? (
                    <p className="text-xs text-fg font-sans leading-relaxed whitespace-pre-wrap">{briefs[siteId]}</p>
                  ) : (
                    <p className="text-xs text-fg-3">Cowork writes this on Saturday at 06:55.</p>
                  )}
                </div>
              </details>

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
                  placeholder="e.g. lean on interview confidence this week, mention OPERATE"
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
          <p>Nothing else to run. Cowork reads this on Saturday, drafts the week and checks it, and the posts appear in the <a href="/review" className="text-accent-text hover:text-accent-text underline">Sunday review</a> for you to approve.</p>
        </div>
      </div>
    </div>
  );
}
