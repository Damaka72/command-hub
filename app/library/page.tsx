'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// ── Content library / repurpose workspace ─────────────────────────────────────
// Browse content_library across ALL weeks, filter by site + platform, and
// "Repurpose" any row: edit a copy and insert it as a NEW draft row targeting a
// chosen site/week/day/platform. The original is never overwritten.

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  theconcurrentcontractor: 'The Concurrent Contractor',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
  didianolue:              'Didi Anolue',
};
// Valid repurpose targets (pipeline sites).
const TARGET_SITES = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];
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

const ASSET_TYPE_BADGE: Record<string, string> = {
  video:    'bg-indigo-900/60 text-indigo-200',
  image:    'bg-cyan-900/60 text-cyan-200',
  carousel: 'bg-purple-900/60 text-purple-200',
};

// Repurposing an asset (not just text) skips the draft queue and goes straight
// to a creation run's worklist — see /api/library POST for what each value does.
const REPURPOSE_ASSET_TYPES = [
  { value: '',         label: 'Text only (draft, as today)' },
  { value: 'video',    label: 'Video — flag for creation' },
  { value: 'image',    label: 'Image — flag for creation' },
  { value: 'carousel', label: 'Carousel — flag for creation' },
];
interface LibraryResponse {
  rows:      LibraryRow[];
  sites:     string[];
  platforms: string[];
}

// Monday (YYYY-MM-DD) of the week containing today — sensible default target.
function currentMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface RepurposeDraft {
  siteId:    string;
  week:      string;
  day:       string;
  platform:  string;
  content:   string;
  assetType: string; // '' = text-only, else 'video' | 'image' | 'carousel'
}

export default function LibraryPage() {
  const [data, setData]       = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [siteFilter, setSiteFilter]         = useState('');
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

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r =>
      (!siteFilter || r.site_id === siteFilter) &&
      (!platformFilter || r.platform === platformFilter)
    );
  }, [data, siteFilter, platformFilter]);

  function openRepurpose(row: LibraryRow) {
    setOpenId(row.id);
    setFlash('');
    setDraft({
      siteId:    row.site_id,
      week:      currentMonday(),
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Dashboard</a>
          <h1 className="text-lg font-semibold text-white">Content Library</h1>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <>
              <select
                value={siteFilter}
                onChange={e => setSiteFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All sites</option>
                {data.sites.map(s => (
                  <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>
                ))}
              </select>
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All platforms</option>
                {data.platforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {flash && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <p className="text-blue-200 text-sm">{flash}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {loading && !data && <p className="text-gray-400 text-sm">Loading…</p>}

        {data && (
          <p className="text-xs text-gray-500">
            {filtered.length} of {data.rows.length} rows
            {data.rows.length >= 500 && ' (showing the 500 most recent)'}
          </p>
        )}

        {data && filtered.map(row => {
          const isOpen = openId === row.id;
          const preview = row.edited_content ?? row.content ?? '';
          return (
            <div key={row.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-gray-400">
                    <span className="text-gray-200 font-medium">{SITE_LABELS[row.site_id] ?? row.site_id}</span>
                    <span>·</span>
                    <span>{row.week_commencing ?? 'no week'}</span>
                    <span>·</span>
                    <span>{row.day_name ?? '—'}</span>
                    <span>·</span>
                    <span className="text-gray-300">{row.platform ?? '—'}</span>
                    <span className={`px-2 py-0.5 rounded-full ${STATUS_PILL[row.status] ?? 'bg-gray-700 text-gray-200'}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    {row.repurposed_from_id && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200" title={`Repurposed from ${row.repurposed_from_id}`}>
                        Repurposed
                      </span>
                    )}
                  </div>
                  {row.asset_type && (
                    <span className={`inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${ASSET_TYPE_BADGE[row.asset_type] ?? 'bg-gray-800 text-gray-300'}`}>
                      {row.asset_type}{row.creation_tool ? ` · ${row.creation_tool}` : ''}{row.aspect_ratio ? ` · ${row.aspect_ratio}` : ''}
                    </span>
                  )}
                  {row.asset_type === 'image' && row.media_urls?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.media_urls[0]} alt="" className="max-h-32 rounded-lg border border-gray-700 mb-2 object-cover" />
                  )}
                  {row.asset_type === 'video' && row.media_urls?.[0] && (
                    <video src={row.media_urls[0]} controls muted className="max-h-32 rounded-lg border border-gray-700 mb-2 bg-black" />
                  )}
                  <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {preview.length > 280 && !isOpen ? preview.slice(0, 280) + '…' : preview}
                  </p>
                </div>
                <button
                  onClick={() => (isOpen ? closeRepurpose() : openRepurpose(row))}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-700 hover:bg-purple-600 text-white"
                >
                  {isOpen ? 'Cancel' : 'Repurpose'}
                </button>
              </div>

              {/* Repurpose editor */}
              {isOpen && draft && (
                <div className="mt-4 border-t border-gray-800 pt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-5">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Repurpose as</label>
                      <select
                        value={draft.assetType}
                        onChange={e => setDraft(d => d && { ...d, assetType: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {REPURPOSE_ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Target site</label>
                      <select
                        value={draft.siteId}
                        onChange={e => setDraft(d => d && { ...d, siteId: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {TARGET_SITES.map(s => (
                          <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Week</label>
                      <input
                        type="date"
                        value={draft.week}
                        onChange={e => setDraft(d => d && { ...d, week: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Day</label>
                      <select
                        value={draft.day}
                        onChange={e => setDraft(d => d && { ...d, day: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {DAY_NAMES.map(dn => <option key={dn} value={dn}>{dn}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">Platform</label>
                      {data && data.platforms.length > 0 ? (
                        <select
                          value={draft.platform}
                          onChange={e => setDraft(d => d && { ...d, platform: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="">— select —</option>
                          {data.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={draft.platform}
                          onChange={e => setDraft(d => d && { ...d, platform: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wide">
                      {draft.assetType ? 'Creation brief (what the new asset should be)' : 'Content (editable copy)'}
                    </label>
                    <textarea
                      value={draft.content}
                      onChange={e => setDraft(d => d && { ...d, content: e.target.value })}
                      rows={6}
                      placeholder={draft.assetType ? `e.g. "Cut this into a 9:16 vertical for TikTok, keep the same script and pacing."` : undefined}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => submitRepurpose(row.id)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : draft.assetType ? 'Flag for creation' : 'Add as new draft'}
                    </button>
                    <button
                      onClick={closeRepurpose}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200"
                    >
                      Cancel
                    </button>
                    <span className="text-xs text-gray-500">
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
          <p className="text-sm text-gray-600">No rows match the current filters.</p>
        )}
      </div>
    </div>
  );
}
