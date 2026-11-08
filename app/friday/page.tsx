'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import WeekSelector from '../components/WeekSelector';
import Link from 'next/link';

// ── Friday report ─────────────────────────────────────────────────────────────
// End-of-week analysis for the current (or selected) week. Four panels:
//   1. Planned vs published — content_library counts by status, per site.
//   2. Newsletter status    — the three publications' status for the week.
//   3. Gumroad revenue      — this week vs last week.
//   4. Subscriber counts    — manual entry form + week-over-week table.
// All data comes from GET /api/friday?week=...; the subscriber form POSTs there.

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
};
const SITE_ORDER = ['masteryourcareerpath', 'oldoaktown', 'aiviralvideoprompts'];

// content_library statuses, in the order shown across the planned-vs-published row.
const STATUS_KEYS = ['draft', 'approved', 'approved_needs_media', 'rejected', 'pushed', 'failed'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];
const STATUS_LABEL: Record<StatusKey, string> = {
  draft: 'Draft', approved: 'Approved', approved_needs_media: 'Needs media',
  rejected: 'Rejected', pushed: 'Pushed', failed: 'Failed',
};

const PUBLICATIONS = [
  { slug: 'the-prompt-ly', title: 'The Prompt-ly' },
  { slug: 'the-pathway',   title: 'The Pathway' },
  { slug: 'the-oak',       title: 'The Oak' },
];

const NL_STATUS_PILL: Record<string, string> = {
  draft:     'bg-panel-3 text-fg',
  finalised: 'bg-warn/15 text-warn',
  sent:      'bg-ok/15 text-ok',
};
const NL_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', finalised: 'Finalised', sent: 'Sent',
};

// ── Response shape (implemented by app/api/friday/route.ts, Job 2) ────────────
interface PlannedRow {
  siteId: string;
  counts: Record<StatusKey, number>;
  total:  number;
}
interface NewsletterStatus {
  slug:   string;
  title:  string;
  status: string | null; // null = no newsletter row for the week yet
}
interface GumroadWeeks {
  thisWeek: number | null;
  lastWeek: number | null;
}
interface SubscriberRow {
  publication:      string;
  week_commencing:  string;
  subscriber_count: number | null;
}
interface FridayResponse {
  week:            string;
  planned:         PlannedRow[];
  newsletters:     NewsletterStatus[];
  gumroad:         GumroadWeeks;
  subscriberCounts: SubscriberRow[];
}

function fmtMoney(n: number | null): string {
  return n === null ? '—' : `£${n.toLocaleString()}`;
}

export default function FridayPage() {
  const { week }               = useWeek();
  const [data, setData]       = useState<FridayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Subscriber form: publication slug → count string (uncontrolled-ish local edits).
  const [subForm, setSubForm] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState<string | null>(null); // slug being saved
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback((w: string) => {
    setLoading(true);
    setError('');
    fetch(`/api/friday?week=${w}`)
      .then(r => r.json())
      .then((d: FridayResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        // Pre-fill the form with this week's already-logged counts.
        const seed: Record<string, string> = {};
        for (const s of d.subscriberCounts) {
          if (s.week_commencing === w && s.subscriber_count !== null) {
            seed[s.publication] = String(s.subscriber_count);
          }
        }
        setSubForm(seed);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(week); }, [week, load]);

  async function saveSubscriber(slug: string) {
    const raw = subForm[slug];
    if (raw === undefined || raw.trim() === '') return;
    const count = Number(raw);
    if (!Number.isFinite(count) || count < 0) {
      setSaveMsg('Enter a valid subscriber count.');
      return;
    }
    setSaving(slug);
    setSaveMsg('');
    try {
      const res = await fetch('/api/friday', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publication: slug, week, subscriberCount: count }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSaveMsg(`Saved ${PUBLICATIONS.find(p => p.slug === slug)?.title ?? slug}.`);
      load(week); // refresh the week-over-week table
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  }

  // Pivot subscriberCounts into a week-over-week table: rows = weeks (desc),
  // columns = publications.
  const historyWeeks = data
    ? [...new Set(data.subscriberCounts.map(s => s.week_commencing))].sort((a, b) => b.localeCompare(a))
    : [];
  const subLookup = new Map<string, number | null>();
  for (const s of data?.subscriberCounts ?? []) {
    subLookup.set(`${s.week_commencing}|${s.publication}`, s.subscriber_count);
  }

  const gumroadDelta = data && data.gumroad.thisWeek !== null && data.gumroad.lastWeek !== null
    ? data.gumroad.thisWeek - data.gumroad.lastWeek
    : null;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <div className="border-b border-line px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-fg-2 hover:text-fg text-sm">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-fg">Friday Report</h1>
        </div>
        <WeekSelector />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-bad/15 border border-bad/60 rounded-lg p-4">
            <p className="text-bad text-sm">{error}</p>
          </div>
        )}
        {loading && !data && <p className="text-fg-2 text-sm">Loading…</p>}

        {data && (
          <>
            {/* ── Panel 1: Planned vs published ── */}
            <section className="bg-panel border border-line-2 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-1">Planned vs published</h2>
              <p className="text-xs text-fg-3 mb-4">Content library rows for this week, by status — am I actually posting?</p>
              <div className="space-y-3">
                {SITE_ORDER.map(siteId => {
                  const row = data.planned.find(p => p.siteId === siteId);
                  const counts = row?.counts;
                  const total = row?.total ?? 0;
                  const pushed = counts?.pushed ?? 0;
                  const inReview = (counts?.draft ?? 0) + (counts?.approved ?? 0) + (counts?.approved_needs_media ?? 0);
                  return (
                    <div key={siteId} className="border border-line rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-fg">{SITE_LABELS[siteId] ?? siteId}</span>
                        <span className="text-xs text-fg-2">
                          {total} planned · <span className="text-accent-text">{pushed} pushed</span> · <span className="text-warn">{inReview} in review</span>
                        </span>
                      </div>
                      {/* Stacked bar of statuses */}
                      {total > 0 ? (
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-panel-2">
                          {STATUS_KEYS.map(k => {
                            const v = counts?.[k] ?? 0;
                            if (v === 0) return null;
                            const color: Record<StatusKey, string> = {
                              draft: 'var(--idle)', approved: 'var(--ok)', approved_needs_media: 'var(--warn)',
                              rejected: 'var(--fg-3)', pushed: 'var(--info)', failed: 'var(--bad)',
                            };
                            return (
                              <div
                                key={k}
                                title={`${STATUS_LABEL[k]}: ${v}`}
                                style={{ width: `${(v / total) * 100}%`, background: color[k] }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-fg-3">No content generated for this week.</p>
                      )}
                      {/* Count chips */}
                      {total > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {STATUS_KEYS.map(k => {
                            const v = counts?.[k] ?? 0;
                            if (v === 0) return null;
                            return (
                              <span key={k} className="text-[13px] text-fg-2">
                                {STATUS_LABEL[k]}: <span className="text-fg">{v}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Panel 2: Newsletter status ── */}
            <section className="bg-panel border border-line-2 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-4">Newsletter status</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {PUBLICATIONS.map(pub => {
                  const nl = data.newsletters.find(n => n.slug === pub.slug);
                  const status = nl?.status ?? null;
                  return (
                    <div key={pub.slug} className="border border-line rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-fg">{pub.title}</span>
                      {status ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${NL_STATUS_PILL[status] ?? 'bg-panel-3 text-fg'}`}>
                          {NL_STATUS_LABEL[status] ?? status}
                        </span>
                      ) : (
                        <span className="text-xs text-fg-3">Not started</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Panel 3: Gumroad revenue ── */}
            <section className="bg-panel border border-line-2 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-1">Gumroad revenue</h2>
              <p className="text-xs text-fg-3 mb-4">AI Viral Video Prompts — this week vs last week.</p>
              <div className="flex items-end gap-8">
                <div>
                  <p className="text-xs text-fg-2 uppercase tracking-wide">This week</p>
                  <p className="text-2xl font-semibold text-ok">{fmtMoney(data.gumroad.thisWeek)}</p>
                </div>
                <div>
                  <p className="text-xs text-fg-2 uppercase tracking-wide">Last week</p>
                  <p className="text-2xl font-semibold text-fg">{fmtMoney(data.gumroad.lastWeek)}</p>
                </div>
                {gumroadDelta !== null && (
                  <div>
                    <p className="text-xs text-fg-2 uppercase tracking-wide">Change</p>
                    <p className={`text-2xl font-semibold ${gumroadDelta >= 0 ? 'text-ok' : 'text-bad'}`}>
                      {gumroadDelta >= 0 ? '+' : '−'}£{Math.abs(gumroadDelta).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {data.gumroad.thisWeek === null && data.gumroad.lastWeek === null && (
                <p className="mt-3 text-xs text-fg-3">No Gumroad data available (GUMROAD_ACCESS not set, or the API returned nothing).</p>
              )}
            </section>

            {/* ── Panel 4: Subscriber counts ── */}
            <section className="bg-panel border border-line-2 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-fg mb-1">Subscriber counts</h2>
              <p className="text-xs text-fg-3 mb-4">Manual entry — no Beehiiv API on the free plan. Log each publication&apos;s current count for this week.</p>

              {/* Entry form */}
              <div className="grid gap-3 sm:grid-cols-3 mb-5">
                {PUBLICATIONS.map(pub => (
                  <div key={pub.slug} className="border border-line rounded-lg p-3">
                    <label className="block text-xs text-fg mb-1">{pub.title}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={subForm[pub.slug] ?? ''}
                        onChange={e => setSubForm(prev => ({ ...prev, [pub.slug]: e.target.value }))}
                        placeholder="count"
                        className="w-full bg-panel-2 border border-line-2 rounded-lg px-2 py-1.5 text-fg text-sm focus:outline-none focus:border-accent/70 placeholder-fg-3"
                      />
                      <button
                        onClick={() => saveSubscriber(pub.slug)}
                        disabled={saving === pub.slug}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent hover:brightness-125 text-on-solid disabled:opacity-50"
                      >
                        {saving === pub.slug ? '…' : 'Log'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {saveMsg && <p className="text-xs text-fg-2 mb-4">{saveMsg}</p>}

              {/* Week-over-week table */}
              {historyWeeks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-fg-3 border-b border-line">
                        <th className="py-2 pr-4 font-medium">Week</th>
                        {PUBLICATIONS.map(pub => (
                          <th key={pub.slug} className="py-2 pr-4 font-medium">{pub.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyWeeks.map(w => (
                        <tr key={w} className="border-b border-line/60">
                          <td className="py-2 pr-4 text-fg">{w}</td>
                          {PUBLICATIONS.map(pub => {
                            const v = subLookup.get(`${w}|${pub.slug}`);
                            return (
                              <td key={pub.slug} className="py-2 pr-4 text-fg">
                                {v === null || v === undefined ? '—' : v.toLocaleString()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-fg-3">No subscriber counts logged yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
