'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWeek } from '../context/WeekContext';
import WeekSelector from '../components/WeekSelector';

interface Row {
  id:                    string;
  site_id:               string;
  week_commencing:       string;
  day_name:              string;
  platform:              string;
  grader_verdict:        string | null;
  status:                string;
  content:               string;
  edited_content:        string | null;
  media_urls:            string[] | null;
  approved_at:           string | null;
  blotato_submission_id: string | null;
  scheduled_for:         string | null;
  push_error:            string | null;
  asset_type:            string | null;
  creation_tool:         string | null;
  drive_file_id:         string | null;
  asset_duration_s:      number | null;
  aspect_ratio:          string | null;
  creation_requested_at: string | null;
}

// A short "3h ago" / "2d ago" label for the Create-requested marker.
function agoLabel(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// Inline preview for a row's first media URL — video gets a muted player,
// image gets an <img>; both fall back to a plain link if the asset type is
// unknown or the URL fails to render (Drive's direct-download bridge can be
// slow or occasionally challenge automated fetches).
function MediaPreview({ row }: { row: Row }) {
  const [broken, setBroken] = useState(false);
  const url = (row.media_urls ?? [])[0];
  if (!url) return null;

  if (!broken && row.asset_type === 'video') {
    return (
      <video
        src={url}
        controls
        muted
        className="w-full max-w-[220px] rounded-lg border border-gray-700 bg-black"
        onError={() => setBroken(true)}
      />
    );
  }
  if (!broken && (row.asset_type === 'image' || row.asset_type === 'carousel')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="max-h-[160px] rounded-lg border border-gray-700 object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline break-all">
      {url}
    </a>
  );
}

// Platforms that can't publish without media attached (mirrors the push route /
// accounts.ts). Used only for UI hinting here.
const MEDIA_PLATFORMS = new Set(['Instagram', 'TikTok', 'Pinterest', 'YouTube']);

// Parse a textarea's worth of URLs (one per line, or comma-separated) into a
// clean array; and render an array back into that textarea form.
function parseMediaUrls(raw: string): string[] {
  return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath:    'Master Your Career Path',
  theconcurrentcontractor: 'The Concurrent Contractor',
  oldoaktown:              'Old Oak Town',
  aiviralvideoprompts:     'AI Viral Video Prompts',
};
const SITE_ORDER = ['masteryourcareerpath', 'theconcurrentcontractor', 'oldoaktown', 'aiviralvideoprompts'];
const DAY_ORDER: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

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

export default function ReviewPage() {
  const { week }             = useWeek();
  const [rows, setRows]     = useState<Row[]>([]);
  const [edits, setEdits]   = useState<Record<string, string>>({});
  const [mediaEdits, setMediaEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState<string | null>(null); // label of the in-flight action

  // Creation is requested here but actually produced out-of-band by the video
  // producer, which calls back via /api/library/asset once an asset is ready.
  // We track in-flight batches client-side (site → row ids) so we can show a
  // progress bar while polling, keyed off creation_requested_at / media_urls
  // rather than any job id — there is no job to ask, only row state. A ref
  // mirrors the state so fetch callbacks (useCallback with a `[]` dep list)
  // always reconcile against the latest batches, not a stale closure.
  const [creatingIds, setCreatingIds]     = useState<Record<string, string[]>>({});
  const [justCompleted, setJustCompleted] = useState<Record<string, Row[]>>({});
  const creatingIdsRef = useRef<Record<string, string[]>>({});

  // Given a fresh row set: seed any newly-pending (requested, no media yet)
  // rows into the tracked batches, and move any batch that's now fully done
  // into justCompleted. Called from fetch callbacks, not effect bodies, so
  // it's free to update state as needed.
  const reconcileCreating = useCallback((freshRows: Row[]) => {
    const next: Record<string, string[]> = {};
    for (const [siteId, ids] of Object.entries(creatingIdsRef.current)) next[siteId] = [...ids];
    for (const row of freshRows) {
      if (row.status === 'approved_needs_media' && row.creation_requested_at && !(row.media_urls?.length)) {
        const existing = next[row.site_id] ?? [];
        if (!existing.includes(row.id)) next[row.site_id] = [...existing, row.id];
      }
    }

    const newlyDone: Record<string, Row[]> = {};
    for (const [siteId, ids] of Object.entries(next)) {
      const batchRows = freshRows.filter(r => ids.includes(r.id));
      if (batchRows.length === ids.length && batchRows.every(r => (r.media_urls?.length ?? 0) > 0)) {
        newlyDone[siteId] = batchRows;
        delete next[siteId];
      }
    }

    creatingIdsRef.current = next;
    setCreatingIds(next);
    if (Object.keys(newlyDone).length > 0) {
      setJustCompleted(prev => ({ ...prev, ...newlyDone }));
    }
  }, []);

  const load = useCallback((w: string) => {
    setLoading(true);
    setError('');
    fetch(`/api/review?week=${w}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const freshRows: Row[] = data.rows ?? [];
        setRows(freshRows);
        setEdits({});
        setMediaEdits({});
        // Pick up rows already mid-creation — whether just requested here or
        // (after a page reload) still pending from an earlier visit — so the
        // progress bar survives a refresh instead of only appearing on click.
        reconcileCreating(freshRows);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [reconcileCreating]);

  // Lighter refresh used while polling an in-flight batch — updates row state
  // (so progress + previews advance) without clobbering whatever the user is
  // mid-typing elsewhere on the page the way a full load() would.
  const pollRows = useCallback((w: string) => {
    fetch(`/api/review?week=${w}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const freshRows: Row[] = data.rows ?? [];
        setRows(freshRows);
        reconcileCreating(freshRows);
      })
      .catch(() => {});
  }, [reconcileCreating]);

  useEffect(() => { load(week); }, [week, load]);

  // Poll while any site has an in-flight creation batch.
  useEffect(() => {
    if (Object.keys(creatingIds).length === 0) return;
    const t = setInterval(() => pollRows(week), 6_000);
    return () => clearInterval(t);
  }, [creatingIds, week, pollRows]);

  const textFor  = (row: Row) => edits[row.id] ?? row.edited_content ?? row.content;
  const mediaFor = (row: Row) => mediaEdits[row.id] ?? (row.media_urls ?? []).join('\n');

  async function saveEdit(row: Row) {
    setBusy(`save-${row.id}`);
    const mediaUrls = parseMediaUrls(mediaFor(row));
    try {
      const res = await fetch('/api/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, editedContent: textFor(row), mediaUrls }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, edited_content: textFor(row), media_urls: mediaUrls } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function setStatus(action: 'approve' | 'reject' | 'request_creation', ids: string[], label: string) {
    if (!ids.length) return;
    setBusy(label);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function push(siteId: string | undefined, label: string) {
    setBusy(label);
    setError('');
    try {
      const res = await fetch('/api/review/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week, siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed');
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  const bySite = SITE_ORDER
    .map(siteId => ({ siteId, items: rows.filter(r => r.site_id === siteId) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Dashboard</a>
          <h1 className="text-lg font-semibold text-white">Review Queue</h1>
        </div>
        <div className="flex items-center gap-3">
          <WeekSelector />
          <button
            onClick={() => push(undefined, 'push-all')}
            disabled={busy !== null}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {busy === 'push-all' ? 'Pushing…' : 'Push approved to Blotato'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>
        )}
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}
        {!loading && bySite.length === 0 && (
          <p className="text-gray-400 text-sm">No content in the library for week commencing {week}. Run the pipeline for this week, then refresh.</p>
        )}

        {bySite.map(({ siteId, items }) => {
          const sorted    = [...items].sort((a, b) => (DAY_ORDER[a.day_name] ?? 9) - (DAY_ORDER[b.day_name] ?? 9));
          const draftIds  = items.filter(r => r.status === 'draft').map(r => r.id);
          // Needs-media rows still waiting on a URL (once one is pasted + saved they
          // become pushable and drop off this list).
          const needsMedia = items.filter(r => r.status === 'approved_needs_media' && !(r.media_urls?.length));
          const notYetRequested = needsMedia.filter(r => !r.creation_requested_at);
          const counts = items.reduce((m, r) => { m[r.status] = (m[r.status] ?? 0) + 1; return m; }, {} as Record<string, number>);

          // In-flight creation batch for this site, if any, plus its last
          // completed batch (kept around until dismissed).
          const activeIds     = creatingIds[siteId] ?? [];
          const creatingRows  = activeIds.length ? items.filter(r => activeIds.includes(r.id)) : [];
          const creatingDone  = creatingRows.filter(r => (r.media_urls?.length ?? 0) > 0).length;
          const creatingTotal = creatingRows.length;
          const creatingPct   = creatingTotal ? Math.round((creatingDone / creatingTotal) * 100) : 0;
          const completedBatch = justCompleted[siteId];

          return (
            <div key={siteId} className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-white">{SITE_LABELS[siteId] ?? siteId}</h2>
                  <span className="text-xs text-gray-500">
                    {Object.entries(counts).map(([s, n]) => `${n} ${STATUS_LABEL[s] ?? s}`).join(' · ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStatus('approve', draftIds, `approve-all-${siteId}`)}
                    disabled={busy !== null || draftIds.length === 0}
                    className="rounded-lg bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    {busy === `approve-all-${siteId}` ? 'Approving…' : `Approve all drafts (${draftIds.length})`}
                  </button>
                  <button
                    onClick={() => push(siteId, `push-${siteId}`)}
                    disabled={busy !== null}
                    className="rounded-lg bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {busy === `push-${siteId}` ? 'Pushing…' : 'Push approved'}
                  </button>
                </div>
              </div>

              {/* In-flight creation progress — appears the moment Create all is
                  clicked and survives a page reload while it's still running. */}
              {creatingTotal > 0 && (
                <div className="rounded-lg border border-amber-700 bg-amber-900/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <p className="text-amber-200 text-xs font-semibold uppercase tracking-wide">
                        Creating media… {creatingDone}/{creatingTotal}
                      </p>
                    </div>
                    <span className="text-amber-100/60 text-[11px]">Runs via the video producer — can take a few minutes</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={creatingPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Creating media: ${creatingDone} of ${creatingTotal} ready`}
                    className="h-1.5 w-full rounded-full bg-amber-950/60 overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
                      style={{ width: `${creatingPct}%` }}
                    />
                  </div>
                  <p className="text-amber-100/70 text-[11px]">
                    {creatingRows.map(r => `${r.day_name} ${r.platform}${(r.media_urls?.length ?? 0) > 0 ? ' ✓' : ''}`).join(' · ')}
                  </p>
                </div>
              )}

              {/* Just-finished summary — shows where each asset actually landed. */}
              {creatingTotal === 0 && completedBatch && completedBatch.length > 0 && (
                <div className="rounded-lg border border-green-700 bg-green-900/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-green-200 text-xs font-semibold uppercase tracking-wide">
                      ✓ {completedBatch.length} media stored
                    </p>
                    <button
                      onClick={() => setJustCompleted(prev => { const next = { ...prev }; delete next[siteId]; return next; })}
                      className="text-green-300/70 hover:text-green-200 text-[11px]"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="space-y-1">
                    {completedBatch.map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-2 text-[11px] text-green-100/80">
                        <span>{r.day_name} {r.platform}</span>
                        {r.media_urls?.[0] && (
                          <a href={r.media_urls[0]} target="_blank" rel="noopener noreferrer" className="text-green-300 hover:underline shrink-0">
                            Stored{r.creation_tool ? ` · ${r.asset_type ?? 'asset'} via ${r.creation_tool}` : ''} →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Needs-media strip — items not yet requested */}
              {notYetRequested.length > 0 && (
                <div className="rounded-lg border border-amber-700 bg-amber-900/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-amber-200 text-xs font-semibold uppercase tracking-wide mb-1">Needs media</p>
                      <p className="text-amber-100/80 text-xs">
                        {notYetRequested.map(r => `${r.day_name} ${r.platform}`).join(' · ')}
                      </p>
                    </div>
                    <button
                      onClick={() => setStatus('request_creation', notYetRequested.map(r => r.id), `create-all-${siteId}`)}
                      disabled={busy !== null}
                      className="rounded-lg bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 shrink-0"
                    >
                      {busy === `create-all-${siteId}` ? 'Requesting…' : 'Create all'}
                    </button>
                  </div>
                </div>
              )}

              {/* Items */}
              {sorted.map(row => (
                <div key={row.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-white">{row.day_name}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-300">{row.platform}</span>
                      {row.grader_verdict && (
                        <span className={`text-xs ${row.grader_verdict === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                          grader: {row.grader_verdict}
                        </span>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_PILL[row.status] ?? 'bg-gray-700 text-gray-200'}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </div>

                  <textarea
                    value={textFor(row)}
                    onChange={e => setEdits(prev => ({ ...prev, [row.id]: e.target.value }))}
                    rows={6}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-blue-500"
                  />

                  {/* Existing media, previewed inline rather than just as a URL. */}
                  {(row.media_urls?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <MediaPreview row={row} />
                      {row.creation_tool && (
                        <span className="text-[11px] text-gray-500">
                          {row.asset_type ?? 'asset'} · {row.creation_tool}
                          {row.aspect_ratio ? ` · ${row.aspect_ratio}` : ''}
                          {row.asset_duration_s ? ` · ${Math.round(row.asset_duration_s)}s` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Media URLs — public image/video links, one per line. Required
                      for Instagram/TikTok; optional (but supported) for LinkedIn/Facebook. */}
                  {row.status !== 'pushed' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="block text-[11px] uppercase tracking-wide text-gray-400">
                          Media URLs {MEDIA_PLATFORMS.has(row.platform)
                            ? <span className="text-amber-400">· required for {row.platform}</span>
                            : <span className="text-gray-500">· optional image/video</span>}
                          <span className="text-gray-500"> · generate with Higgsfield, Blotato, or HyperFrames</span>
                        </label>
                        {MEDIA_PLATFORMS.has(row.platform) && !(row.media_urls?.length) && (
                          row.creation_requested_at ? (
                            <span className="text-[11px] text-amber-300/80 shrink-0">Requested {agoLabel(row.creation_requested_at)}</span>
                          ) : (
                            <button
                              onClick={() => setStatus('request_creation', [row.id], `create-${row.id}`)}
                              disabled={busy !== null}
                              className="rounded-lg bg-amber-700 hover:bg-amber-600 text-white px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 shrink-0"
                            >
                              {busy === `create-${row.id}` ? 'Requesting…' : 'Create'}
                            </button>
                          )
                        )}
                      </div>
                      <textarea
                        value={mediaFor(row)}
                        onChange={e => setMediaEdits(prev => ({ ...prev, [row.id]: e.target.value }))}
                        rows={2}
                        placeholder={row.platform === 'TikTok'
                          ? 'https://…/video.mp4  (one per line)'
                          : 'https://…/image.jpg  (one per line; a video URL posts as a reel on Instagram)'}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {row.status === 'pushed' && (row.media_urls?.length ?? 0) > 0 && (
                    <p className="text-[11px] text-blue-300/80 break-all">Media: {row.media_urls!.join(', ')}</p>
                  )}

                  {row.status === 'pushed' && (
                    <p className="text-xs text-blue-300">
                      Pushed{row.scheduled_for ? ` · scheduled ${new Date(row.scheduled_for).toLocaleString('en-GB')}` : ''}
                      {row.blotato_submission_id ? ` · id ${row.blotato_submission_id}` : ''}
                    </p>
                  )}
                  {row.status !== 'pushed' && row.push_error && (
                    <p className="text-xs text-red-400">
                      {row.status === 'rejected' ? 'Grader: ' : 'Push error: '}{row.push_error}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(row)}
                      disabled={busy !== null}
                      className="rounded-lg bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      {busy === `save-${row.id}` ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setStatus('approve', [row.id], `approve-${row.id}`)}
                      disabled={busy !== null || row.status === 'pushed'}
                      className="rounded-lg bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus('reject', [row.id], `reject-${row.id}`)}
                      disabled={busy !== null || row.status === 'pushed'}
                      className="rounded-lg bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
