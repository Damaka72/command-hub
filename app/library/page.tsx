'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import { useSiteFilter } from '../context/SiteFilterContext';
import WeekSelector from '../components/WeekSelector';
import SiteFilterChips from '../components/SiteFilterChips';
import WeekView from '../components/library/WeekView';
import MonthView from '../components/library/MonthView';
import { PIPELINE_SITE_ORDER, siteColor } from '../lib/siteColors';
import { monthOf, addMonths, formatMonthLabel } from '../lib/weekDates';
import type { LibraryWeekRow } from '../api/library/week/route';
import type { LibraryMonthRow } from '../api/library/month/route';

// ── Content library / repurpose workspace ─────────────────────────────────────
// Browse content_library across ALL weeks, filter by site + platform, and
// "Repurpose" any row: edit a copy and insert it as a NEW draft row targeting a
// chosen site/week/day/platform. The original is never overwritten.
//
// Three-way view switch (UX spec §4): Week · Month · List. Week and Month are
// new — they read the shared week/site context so navigating in from the home
// page's "Week view →" link lands pre-filtered and pre-anchored to the right
// week (UX spec §5).
//
// Repurposing an asset (not just text) skips the draft queue and goes straight
// to a creation run's worklist — see /api/library POST for what each value does.

type View = 'week' | 'month' | 'list';

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  theconcurrentcontractor: 'The Concurrent Contractor',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
  didianolue:              'Didi Anolue',
};
// Valid repurpose targets (pipeline sites).
const TARGET_SITES = PIPELINE_SITE_ORDER;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const STATUS_PILL: Record<string, string> = {
  draft:                'bg-gray-700 text-gray-200',
  approved:             'bg-green-800 text-green-100',
  approved_needs_media: 'bg-amber-800 text-amber-100',
  rejected:             'bg-red-900 text-red-300',
  pushed:               'bg-blue-800 text-blue-100',
  failed:               'bg-red-800 text-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', approved: 'Approved', approved_needs_media: 'Needs media',
  rejected: 'Rejected', pushed: 'Pushed', failed: 'Failed',
};

const ASSET_TYPE_BADGE: Record<string, string> = {
  video:    'bg-indigo-900/60 text-indigo-200',
  image:    'bg-cyan-900/60 text-cyan-200',
  carousel: 'bg-purple-900/60 text-purple-200',
};

const REPURPOSE_ASSET_TYPES = [
  { value: '',         label: 'Text only (draft, as today)' },
  { value: 'video',    label: 'Video — flag for creation' },
  { value: 'image',    label: 'Image — flag for creation' },
  { value: 'carousel', label: 'Carousel — flag for creation' },
];

interface LibraryRow {
  id:                 string;
  site_id:            string;
  week_commencing:    string | null;
  day_name:           string | null;
  platform:           string | null;
  status:             string;
  content:            string | null;
  edited_content:     string | null;
  repurposed_from_id: string | null;
  media_urls:         string[] | null;
  asset_type:         string | null;
  creation_tool:      string | null;
  aspect_ratio:       string | null;
}
interface LibraryResponse {
  rows:      LibraryRow[];
  sites:     string[];
  platforms: string[];
}

interface RepurposeDraft {
  siteId:    string;
  week:      string;
  day:       string;
  platform:  string;
  content:   string;
  assetType: string; // '' = text-only, else 'video' | 'image' | 'carousel'
}

function ViewSegment({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { key: View; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'list', label: 'List' },
  ];
  return (
    <div className="flex rounded-lg p-0.5" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }} role="group" aria-label="View">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
          style={view === o.key
            ? { background: 'var(--hub-accent)', color: 'var(--hub-accent-ink)' }
            : { color: 'var(--fg-2)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const { week, setWeek } = useWeek();
  const { siteId: filterSiteId } = useSiteFilter();

  const [view, setView] = useState<View>(() => {
    if (typeof window === 'undefined') return 'list';
    const v = new URLSearchParams(window.location.search).get('view');
    return v === 'week' || v === 'month' ? v : 'list';
  });
  const [month, setMonth] = useState<string>(() => monthOf(week));

  // ── Week view data ──
  const [weekRows, setWeekRows]       = useState<LibraryWeekRow[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  useEffect(() => {
    if (view !== 'week') return;
    setWeekLoading(true);
    const qs = new URLSearchParams({ week });
    if (filterSiteId) qs.set('site', filterSiteId);
    fetch(`/api/library/week?${qs}`)
      .then(r => r.json())
      .then(d => setWeekRows(d.rows ?? []))
      .catch(() => setWeekRows([]))
      .finally(() => setWeekLoading(false));
  }, [view, week, filterSiteId]);

  // ── Month view data ──
  const [monthRows, setMonthRows]       = useState<LibraryMonthRow[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);

  useEffect(() => {
    if (view !== 'month') return;
    setMonthLoading(true);
    const qs = new URLSearchParams({ month });
    if (filterSiteId) qs.set('site', filterSiteId);
    fetch(`/api/library/month?${qs}`)
      .then(r => r.json())
      .then(d => setMonthRows(d.rows ?? []))
      .catch(() => setMonthRows([]))
      .finally(() => setMonthLoading(false));
  }, [view, month, filterSiteId]);

  function switchToWeek(weekMonday: string) {
    setWeek(weekMonday);
    setView('week');
  }

  // ── List view data (existing browse/repurpose workspace) ──
  const [data, setData]       = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [platformFilter, setPlatformFilter] = useState('');

  // Which row is being repurposed, and the editable target draft.
  const [openId, setOpenId]   = useState<string | null>(null);
  const [draft, setDraft]     = useState<RepurposeDraft | null>(null);
  const [saving, setSaving]   = useState(false);
  const [flash, setFlash]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetch('/api/library')
      .then(r => r.json())
      .then((d: LibraryResponse & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (view === 'list') load(); }, [view, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r =>
      (!filterSiteId || r.site_id === filterSiteId) &&
      (!platformFilter || r.platform === platformFilter)
    );
  }, [data, filterSiteId, platformFilter]);

  function openRepurpose(row: LibraryRow | LibraryWeekRow) {
    setOpenId(row.id);
    setFlash('');
    setView('list');
    setDraft({
      siteId:    row.site_id,
      week:      week,
      day:       row.day_name && DAY_NAMES.includes(row.day_name) ? row.day_name : 'Monday',
      platform:  row.platform ?? '',
      content:   row.edited_content ?? row.content ?? '',
      assetType: '',
    });
  }

  function closeRepurpose() {
    setOpenId(null);
    setDraft(null);
  }

  async function submitRepurpose(sourceId: string) {
    if (!draft) return;
    setSaving(true);
    setFlash('');
    try {
      const res = await fetch('/api/library', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sourceId,
          siteId:    draft.siteId,
          week:      draft.week,
          day:       draft.day,
          platform:  draft.platform,
          content:   draft.content,
          ...(draft.assetType ? { assetType: draft.assetType } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Repurpose failed');
      setFlash(draft.assetType
        ? `Repurposed — flagged for ${draft.assetType} creation, on the worklist now.`
        : 'Repurposed — new draft added to the library.');
      closeRepurpose();
      load();
      setTimeout(() => setFlash(''), 4000);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const filterLabel = filterSiteId ? siteColor(filterSiteId).name : 'all sites';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm" style={{ color: 'var(--fg-3)' }}>← Dashboard</a>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Content Library</h1>
        </div>
      </div>

      {/* Shared control bar (UX spec §4.1) */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <ViewSegment view={view} onChange={setView} />
        <SiteFilterChips siteIds={PIPELINE_SITE_ORDER} />

        <div className="ml-auto flex items-center gap-3">
          {view === 'week' && <WeekSelector />}
          {view === 'month' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMonth(m => addMonths(m, -1))}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all hover:brightness-125"
                style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}
              >
                ‹
              </button>
              <span className="mono-num rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}>
                {formatMonthLabel(month)}
              </span>
              <button
                type="button"
                onClick={() => setMonth(m => addMonths(m, 1))}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-all hover:brightness-125"
                style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg-2)' }}
              >
                ›
              </button>
            </div>
          )}
          {view === 'list' && (
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
            >
              <option value="">All platforms</option>
              {(data?.platforms ?? []).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        {flash && (
          <div className="rounded-lg border border-blue-700 bg-blue-900/30 p-3">
            <p className="text-sm text-blue-200">{flash}</p>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-700 bg-red-900/30 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {view === 'week' && (
          weekLoading && weekRows.length === 0
            ? <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading…</p>
            : <WeekView week={week} rows={weekRows} onOpenRow={openRepurpose} filterLabel={filterLabel} />
        )}

        {view === 'month' && (
          monthLoading && monthRows.length === 0
            ? <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading…</p>
            : <MonthView month={month} rows={monthRows} onCellClick={switchToWeek} />
        )}

        {view === 'list' && (
          <>
            {loading && !data && <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading…</p>}
            {data && (
              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                {filtered.length} of {data.rows.length} rows
                {data.rows.length >= 500 && ' (showing the 500 most recent)'}
              </p>
            )}

            {data && filtered.map(row => {
              const isOpen = openId === row.id;
              const preview = row.edited_content ?? row.content ?? '';
              return (
                <div key={row.id} className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--fg-3)' }}>
                        <span className="font-medium" style={{ color: 'var(--fg)' }}>{SITE_LABELS[row.site_id] ?? row.site_id}</span>
                        <span>·</span>
                        <span>{row.week_commencing ?? 'no week'}</span>
                        <span>·</span>
                        <span>{row.day_name ?? '—'}</span>
                        <span>·</span>
                        <span style={{ color: 'var(--fg-2)' }}>{row.platform ?? '—'}</span>
                        <span className={`px-2 py-0.5 rounded-full ${STATUS_PILL[row.status] ?? 'bg-gray-700 text-gray-200'}`}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                        {row.repurposed_from_id && (
                          <span className="rounded-full bg-purple-900/60 px-2 py-0.5 text-purple-200" title={`Repurposed from ${row.repurposed_from_id}`}>
                            Repurposed
                          </span>
                        )}
                      </div>
                      {row.asset_type && (
                        <span className={`inline-block mb-2 px-2 py-0.5 rounded-full text-[12px] uppercase tracking-wide ${ASSET_TYPE_BADGE[row.asset_type] ?? 'bg-gray-800 text-gray-300'}`}>
                          {row.asset_type}{row.creation_tool ? ` · ${row.creation_tool}` : ''}{row.aspect_ratio ? ` · ${row.aspect_ratio}` : ''}
                        </span>
                      )}
                      {row.asset_type === 'image' && row.media_urls?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.media_urls[0]} alt="" className="mb-2 max-h-32 rounded-lg object-cover" style={{ border: '1px solid var(--line)' }} />
                      )}
                      {row.asset_type === 'video' && row.media_urls?.[0] && (
                        <video src={row.media_urls[0]} controls muted className="mb-2 max-h-32 rounded-lg bg-black" style={{ border: '1px solid var(--line)' }} />
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--fg-2)' }}>
                        {preview.length > 280 && !isOpen ? preview.slice(0, 280) + '…' : preview}
                      </p>
                    </div>
                    <button
                      onClick={() => (isOpen ? closeRepurpose() : openRepurpose(row))}
                      className="shrink-0 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600"
                    >
                      {isOpen ? 'Cancel' : 'Repurpose'}
                    </button>
                  </div>

                  {/* Repurpose editor */}
                  {isOpen && draft && (
                    <div className="mt-4 space-y-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                      <div className="grid gap-3 sm:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Repurpose as</label>
                          <select
                            value={draft.assetType}
                            onChange={e => setDraft(d => d && { ...d, assetType: e.target.value })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm"
                            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          >
                            {REPURPOSE_ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Target site</label>
                          <select
                            value={draft.siteId}
                            onChange={e => setDraft(d => d && { ...d, siteId: e.target.value })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm"
                            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          >
                            {TARGET_SITES.map(s => (
                              <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Week</label>
                          <input
                            type="date"
                            value={draft.week}
                            onChange={e => setDraft(d => d && { ...d, week: e.target.value })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm"
                            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Day</label>
                          <select
                            value={draft.day}
                            onChange={e => setDraft(d => d && { ...d, day: e.target.value })}
                            className="w-full rounded-lg px-2 py-1.5 text-sm"
                            style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                          >
                            {DAY_NAMES.map(dn => <option key={dn} value={dn}>{dn}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Platform</label>
                          {data && data.platforms.length > 0 ? (
                            <select
                              value={draft.platform}
                              onChange={e => setDraft(d => d && { ...d, platform: e.target.value })}
                              className="w-full rounded-lg px-2 py-1.5 text-sm"
                              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                            >
                              <option value="">— select —</option>
                              {data.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={draft.platform}
                              onChange={e => setDraft(d => d && { ...d, platform: e.target.value })}
                              className="w-full rounded-lg px-2 py-1.5 text-sm"
                              style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>
                          {draft.assetType ? 'Creation brief (what the new asset should be)' : 'Content (editable copy)'}
                        </label>
                        <textarea
                          value={draft.content}
                          onChange={e => setDraft(d => d && { ...d, content: e.target.value })}
                          rows={6}
                          placeholder={draft.assetType ? `e.g. "Cut this into a 9:16 vertical for TikTok, keep the same script and pacing."` : undefined}
                          className="w-full rounded-lg px-3 py-2 text-sm"
                          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--fg)' }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => submitRepurpose(row.id)}
                          disabled={saving}
                          className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : draft.assetType ? 'Flag for creation' : 'Add as new draft'}
                        </button>
                        <button
                          onClick={closeRepurpose}
                          className="rounded-lg px-4 py-2 text-sm font-medium"
                          style={{ background: 'var(--panel-2)', color: 'var(--fg-2)' }}
                        >
                          Cancel
                        </button>
                        <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
                          {draft.assetType
                            ? 'Inserts a new row, flagged for creation — the original stays untouched.'
                            : 'Inserts a new draft row — the original stays untouched.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {data && filtered.length === 0 && !loading && (
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No rows match the current filters.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
