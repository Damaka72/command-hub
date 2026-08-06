'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import WeekSelector from '../components/WeekSelector';

// ── Friday report ─────────────────────────────────────────────────────────────
// End-of-week analysis for the current (or selected) week. Four panels:
//   1. Planned vs published — content_library counts by status, per site.
//   2. Newsletter status    — the three publications' status for the week.
//   3. Gumroad revenue      — this week vs last week.
//   4. Subscriber counts    — manual entry form + week-over-week table.
// All data comes from GET /api/friday?week=...; the subscriber form POSTs there.

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  theconcurrentcontractor: 'The Concurrent Contractor',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
};
const SITE_ORDER = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];

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
  draft:     'bg-gray-700 text-gray-200',
  finalised: 'bg-amber-800 text-amber-100',
  sent:      'bg-green-800 text-green-100',
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Dashboard</a>
          <h1 className="text-lg font-semibold text-white">Friday Report</h1>
        </div>
        <WeekSelector />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {loading && !data && <p className="text-gray-400 text-sm">Loading…</p>}

        {data && (
          <>
            {/* ── Panel 1: Planned vs published ── */}
            <section className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Planned vs published</h2>
              <p className="text-xs text-gray-500 mb-4">Content library rows for this week, by status — am I actually posting?</p>
              <div className="space-y-3">
                {SITE_ORDER.map(siteId => {
                  const row = data.planned.find(p => p.siteId === siteId);
                  const counts = row?.counts;
                  const total = row?.total ?? 0;
                  const pushed = counts?.pushed ?? 0;
                  const inReview = (counts?.draft ?? 0) + (counts?.approved ?? 0) + (counts?.approved_needs_media ?? 0);
                  return (
                    <div key={siteId} className="border border-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-200">{SITE_LABELS[siteId] ?? siteId}</span>
                        <span className="text-xs text-gray-400">
                          {total} planned · <span className="text-blue-300">{pushed} pushed</span> · <span className="text-amber-300">{inReview} in review</span>
                        </span>
                      </div>
                      {/* Stacked bar of statuses */}
                      {total > 0 ? (
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-800">
                          {STATUS_KEYS.map(k => {
                            const v = counts?.[k] ?? 0;
                            if (v === 0) return null;
                            const color: Record<StatusKey, string> = {
                              draft: '#6b7280', approved: '#16a34a', approved_needs_media: '#d97706',
                              rejected: '#7f1d1d', pushed: '#2563eb', failed: '#dc2626',
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
                        <p className="text-xs text-gray-600">No content generated for this week.</p>
                      )}
                      {/* Count chips */}
                      {total > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {STATUS_KEYS.map(k => {
                            const v = counts?.[k] ?? 0;
                            if (v === 0) return null;
                            return (
                              <span key={k} className="text-[13px] text-gray-400">
                                {STATUS_LABEL[k]}: <span className="text-gray-200">{v}</span>
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
            <section className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Newsletter status</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {PUBLICATIONS.map(pub => {
                  const nl = data.newsletters.find(n => n.slug === pub.slug);
                  const status = nl?.status ?? null;
                  return (
                    <div key={pub.slug} className="border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-200">{pub.title}</span>
                      {status ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${NL_STATUS_PILL[status] ?? 'bg-gray-700 text-gray-200'}`}>
                          {NL_STATUS_LABEL[status] ?? status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">Not started</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Panel 3: Gumroad revenue ── */}
            <section className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Gumroad revenue</h2>
              <p className="text-xs text-gray-500 mb-4">AI Viral Video Prompts — this week vs last week.</p>
              <div className="flex items-end gap-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">This week</p>
                  <p className="text-2xl font-semibold text-green-400">{fmtMoney(data.gumroad.thisWeek)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Last week</p>
                  <p className="text-2xl font-semibold text-gray-300">{fmtMoney(data.gumroad.lastWeek)}</p>
                </div>
                {gumroadDelta !== null && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Change</p>
                    <p className={`text-2xl font-semibold ${gumroadDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {gumroadDelta >= 0 ? '+' : '−'}£{Math.abs(gumroadDelta).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {data.gumroad.thisWeek === null && data.gumroad.lastWeek === null && (
                <p className="mt-3 text-xs text-gray-600">No Gumroad data available (GUMROAD_ACCESS not set, or the API returned nothing).</p>
              )}
            </section>

            {/* ── Panel 4: Subscriber counts ── */}
            <section className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-1">Subscriber counts</h2>
              <p className="text-xs text-gray-500 mb-4">Manual entry — no Beehiiv API on the free plan. Log each publication&apos;s current count for this week.</p>

              {/* Entry form */}
              <div className="grid gap-3 sm:grid-cols-3 mb-5">
                {PUBLICATIONS.map(pub => (
                  <div key={pub.slug} className="border border-gray-800 rounded-lg p-3">
                    <label className="block text-xs text-gray-300 mb-1">{pub.title}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        value={subForm[pub.slug] ?? ''}
                        onChange={e => setSubForm(prev => ({ ...prev, [pub.slug]: e.target.value }))}
                        placeholder="count"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                      />
                      <button
                        onClick={() => saveSubscriber(pub.slug)}
                        disabled={saving === pub.slug}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                      >
                        {saving === pub.slug ? '…' : 'Log'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {saveMsg && <p className="text-xs text-gray-400 mb-4">{saveMsg}</p>}

              {/* Week-over-week table */}
              {historyWeeks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                        <th className="py-2 pr-4 font-medium">Week</th>
                        {PUBLICATIONS.map(pub => (
                          <th key={pub.slug} className="py-2 pr-4 font-medium">{pub.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyWeeks.map(w => (
                        <tr key={w} className="border-b border-gray-800/60">
                          <td className="py-2 pr-4 text-gray-300">{w}</td>
                          {PUBLICATIONS.map(pub => {
                            const v = subLookup.get(`${w}|${pub.slug}`);
                            return (
                              <td key={pub.slug} className="py-2 pr-4 text-gray-200">
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
                <p className="text-xs text-gray-600">No subscriber counts logged yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
