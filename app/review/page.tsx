'use client';

// ── Sunday review ─────────────────────────────────────────────────────────────
// The one place Didi sees and approves the week's posts. Cowork does the work
// behind it: it researches, drafts, runs the Brand gate and (later) schedules.
//
// Read top to bottom, most important first:
//   1. Needs your decision  - flagged, blocked and failed posts, with the reason
//   2. Ready to approve     - the Brand gate passed them; one action approves all
//   3. Not yet checked      - drafts the Brand gate has not looked at
//   4. Needs media          - Instagram / TikTok posts with no image or video yet
//   5. Approved             - waiting for Cowork to schedule them
//   6. Scheduled            - done
//   7. Rejected             - collapsed

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWeek } from '../context/WeekContext';
import WeekSelector from '../components/WeekSelector';
import SundayChecklist from '../components/SundayChecklist';
import PostCard from './PostCard';
import CompactRow from './CompactRow';
import {
  BUCKET_LABEL, classify, compareRows, summarise,
  type Bucket, type ReviewRow,
} from './classify';

const SITE_LABELS: Record<string, string> = {
  masteryourcareerpath: 'Master Your Career Path',
  oldoaktown:           'Old Oak Town',
  aiviralvideoprompts:  'AI Viral Video Prompts',
};
const LIVE_SITES = Object.keys(SITE_LABELS);

interface PushResultRow {
  id: string; siteId: string; platform: string; day: string;
  status: 'pushed' | 'failed' | 'skipped'; error?: string;
}
interface PushSummary {
  pushed: number; failed: number; skipped: number; results: PushResultRow[];
}

function Section({
  title, count, hint, tone = 'plain', defaultOpen = true, children,
}: {
  title: string; count: number; hint?: string;
  tone?: 'plain' | 'attention' | 'good'; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const toneClass = tone === 'attention' ? 'text-warn' : tone === 'good' ? 'text-ok' : 'text-fg';
  return (
    <details open={defaultOpen} className="group space-y-4">
      <summary className="cursor-pointer list-none flex items-baseline gap-3 flex-wrap">
        <h2 className={`text-base font-semibold ${toneClass}`}>{title}</h2>
        <span className="text-sm text-fg-3">{count}</span>
        {hint && <span className="text-[13px] text-fg-3">{hint}</span>}
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  );
}

export default function ReviewPage() {
  const { week } = useWeek();
  const [rows, setRows]       = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [notice, setNotice]   = useState('');
  const [busy, setBusy]       = useState<string | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [pushSummary, setPushSummary]     = useState<PushSummary | undefined>();

  const load = useCallback((w: string) => {
    setLoading(true);
    setError('');
    fetch(`/api/review?week=${w}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRows(data.rows ?? []);
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  // Loading from an external source on mount and when the week changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(week); }, [week, load]);

  // Cowork works while this tab is in the background: refresh when Didi comes back.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(week); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [week, load]);

  const { live, hiddenCount } = useMemo(() => {
    const live = rows.filter(r => LIVE_SITES.includes(r.site_id));
    return { live, hiddenCount: rows.length - live.length };
  }, [rows]);

  const byBucket = useMemo(() => {
    const m = {} as Record<Bucket, ReviewRow[]>;
    for (const b of Object.keys(BUCKET_LABEL) as Bucket[]) m[b] = [];
    for (const r of live) m[classify(r)].push(r);
    for (const b of Object.keys(m) as Bucket[]) m[b].sort(compareRows);
    return m;
  }, [live]);

  const counts = useMemo(() => summarise(live), [live]);

  async function act(action: 'approve' | 'reject' | 'request_creation', ids: string[], label: string) {
    if (!ids.length) return;
    setBusy(label);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      if (action === 'approve') {
        const n = (data.approved ?? 0) + (data.approvedNeedsMedia ?? 0);
        setNotice(`${n} approved${data.skippedBlocked ? ` · ${data.skippedBlocked} blocked and left alone` : ''}. Cowork schedules approved posts.`);
      }
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  async function saveEdit(row: ReviewRow, text: string, mediaUrls: string[]) {
    setBusy(`save-${row.id}`);
    setError('');
    try {
      const textChanged = text !== (row.edited_content ?? row.content);
      const res = await fetch('/api/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, editedContent: textChanged ? text : undefined, mediaUrls }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      if (textChanged && row.gate_verdict) {
        setNotice('Saved. The edit goes back to the Brand gate for a re-check.');
      }
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  // Fallback publisher. The normal path is Cowork scheduling approved rows.
  async function pushFromHub() {
    setBusy('push');
    setError('');
    setPushSummary(undefined);
    try {
      const res = await fetch('/api/review/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed');
      setPushSummary({ pushed: data.pushed, failed: data.failed, skipped: data.skipped, results: data.results ?? [] });
      load(week);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(null); }
  }

  const isBusy = busy !== null;
  const decision = [...byBucket.blocked, ...byBucket.flagged, ...byBucket.failed].sort(compareRows);
  const mediaRows = [...byBucket.needs_media, ...byBucket.filming].sort(compareRows);
  const readyBySite = LIVE_SITES
    .map(siteId => ({ siteId, items: byBucket.ready.filter(r => r.site_id === siteId) }))
    .filter(g => g.items.length > 0);

  // Posts grouped under a brand heading, as one-line rows that expand.
  const grouped = (rows: ReviewRow[]) =>
    LIVE_SITES
      .map(siteId => ({ siteId, items: rows.filter(r => r.site_id === siteId) }))
      .filter(g => g.items.length > 0)
      .map(({ siteId, items }) => (
        <div key={siteId} className="space-y-2">
          <h3 className="text-sm font-medium text-fg-2">{SITE_LABELS[siteId]} <span className="text-fg-3 font-normal">· {items.length}</span></h3>
          {items.map(r => card(r, false, true))}
        </div>
      ));

  const card = (row: ReviewRow, showSite: boolean, compact = false) => {
    const el = (
    <PostCard
      key={`${row.id}-${row.edited_content ?? ''}-${(row.media_urls ?? []).join('|')}-${row.status}`}
      row={row}
      bucket={classify(row)}
      siteLabel={showSite ? SITE_LABELS[row.site_id] ?? row.site_id : undefined}
      busy={isBusy}
      onSave={saveEdit}
      onApprove={id => act('approve', [id], `approve-${id}`)}
      onReject={id => act('reject', [id], `reject-${id}`)}
      onRequestCreation={id => act('request_creation', [id], `create-${id}`)}
    />
    );
    return compact
      ? <CompactRow key={row.id} row={row} siteLabel={showSite ? SITE_LABELS[row.site_id] ?? row.site_id : undefined}>{el}</CompactRow>
      : el;
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="border-b border-line px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-fg-2 hover:text-fg text-sm">← Dashboard</Link>
          <h1 className="text-lg font-semibold text-fg">Sunday review</h1>
        </div>
        <div className="flex items-center gap-3">
          <WeekSelector />
          <button
            onClick={() => load(week)}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-sm bg-panel-2 hover:brightness-125 text-fg border border-line-2 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => setChecklistOpen(o => !o)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              checklistOpen ? 'bg-panel-3 text-fg' : 'bg-panel-2 hover:brightness-125 text-fg border border-line-2'
            }`}
          >
            {checklistOpen ? '▲ Checklist' : '▼ Checklist'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {checklistOpen && <SundayChecklist />}

        {error && <div className="bg-bad/15 border border-bad/60 rounded-lg p-4 text-bad text-sm">{error}</div>}
        {notice && !error && <div className="bg-ok/15 border border-ok/60 rounded-lg p-4 text-ok text-sm">{notice}</div>}

        {/* Summary: the whole week at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Week summary">
          {([
            ['Needs your decision', counts.blocked + counts.flagged + counts.failed, 'text-warn'],
            ['Ready to approve',    counts.ready,                                     'text-ok'],
            ['Not yet checked',     counts.unchecked,                                 'text-fg-2'],
            ['Needs media',         counts.needs_media + counts.filming,              'text-warn'],
            ['Approved',            counts.approved,                                  'text-ok'],
            ['Scheduled',           counts.scheduled,                                 'text-accent-text'],
            ['Rejected',            counts.rejected,                                  'text-fg-3'],
          ] as const).map(([label, n, tone]) => (
            <div key={label} className="rounded-xl border border-line-2 bg-panel px-4 py-3">
              <p className={`text-2xl font-semibold ${tone}`}>{n}</p>
              <p className="text-[13px] text-fg-3">{label}</p>
            </div>
          ))}
        </div>

        {!loading && live.length === 0 && (
          <p className="text-fg-2 text-sm">
            Nothing drafted for week commencing {week} yet. Cowork researches and drafts on Saturday at 06:55.
          </p>
        )}

        {decision.length > 0 && (
          <Section title="Needs your decision" count={decision.length} tone="attention"
            hint="Flagged, blocked or failed. Read the reason on each card.">
            {decision.map(r => card(r, true))}
          </Section>
        )}

        {readyBySite.length > 0 && (
          <Section title="Ready to approve" count={byBucket.ready.length} tone="good"
            hint="The Brand gate passed these. One click approves them all.">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => act('approve', byBucket.ready.map(r => r.id), 'approve-all-ready')}
                disabled={isBusy}
                className="rounded-lg bg-ok hover:brightness-125 text-on-solid px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                {busy === 'approve-all-ready' ? 'Approving…' : `Approve all ready (${byBucket.ready.length})`}
              </button>
              <span className="text-[13px] text-fg-3">
                This is your sign-off. Nothing publishes without it, and blocked posts are never included.
              </span>
            </div>
            {readyBySite.map(({ siteId, items }) => (
              <details key={siteId} className="rounded-xl border border-line-2 bg-panel">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-fg">
                    {SITE_LABELS[siteId]} <span className="text-fg-3 font-normal">· {items.length} ready</span>
                  </span>
                  <button
                    onClick={e => { e.preventDefault(); act('approve', items.map(r => r.id), `approve-ready-${siteId}`); }}
                    disabled={isBusy}
                    className="rounded-lg bg-ok/15 hover:brightness-125 text-ok px-3 py-1 text-xs font-medium disabled:opacity-40"
                  >
                    Approve these {items.length}
                  </button>
                </summary>
                <div className="space-y-2 p-4 pt-0">{items.map(r => card(r, false, true))}</div>
              </details>
            ))}
          </Section>
        )}

        {byBucket.unchecked.length > 0 && (
          <Section title="Not yet checked" count={byBucket.unchecked.length}
            hint="Cowork's Brand gate has not looked at these. Ask Cowork to check them, or approve one at a time.">
            {grouped(byBucket.unchecked)}
          </Section>
        )}

        {mediaRows.length > 0 && (
          <Section title="Needs media" count={mediaRows.length} tone="attention"
            hint="Instagram and TikTok cannot publish without an image or video.">
            <p className="text-[13px] text-fg-3">
              Cowork&apos;s media desk makes the first group every morning at 07:30, or straight away if you tell Cowork to
              run the media desk. Only you can film the second. How video gets made is on the{' '}
              <Link href="/video-studio" className="text-accent-text underline">Video Studio</Link> page.
            </p>
            {byBucket.needs_media.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-medium text-fg">Cowork can make · {byBucket.needs_media.length}</h3>
                  {byBucket.needs_media.some(r => !r.creation_requested_at) && (
                    <button
                      onClick={() => act('request_creation', byBucket.needs_media.filter(r => !r.creation_requested_at).map(r => r.id), 'create-all')}
                      disabled={isBusy}
                      className="rounded-lg bg-warn hover:brightness-125 text-on-solid px-3 py-1 text-xs font-medium disabled:opacity-50"
                    >
                      {busy === 'create-all' ? 'Asking…' : `Ask Cowork to create all (${byBucket.needs_media.filter(r => !r.creation_requested_at).length})`}
                    </button>
                  )}
                </div>
                {grouped(byBucket.needs_media)}
              </div>
            )}
            {byBucket.filming.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-fg">You film · {byBucket.filming.length}</h3>
                {grouped(byBucket.filming)}
              </div>
            )}
          </Section>
        )}

        {byBucket.approved.length > 0 && (
          <Section title="Approved, waiting for Cowork to schedule" count={byBucket.approved.length}
            hint="Tell Cowork 'schedule this week' and these go into Blotato.">
            {grouped(byBucket.approved)}
          </Section>
        )}

        {byBucket.scheduled.length > 0 && (
          <Section title="Scheduled" count={byBucket.scheduled.length} defaultOpen={false}>
            {grouped(byBucket.scheduled)}
          </Section>
        )}

        {byBucket.rejected.length > 0 && (
          <Section title="Rejected" count={byBucket.rejected.length} defaultOpen={false}>
            {grouped(byBucket.rejected)}
          </Section>
        )}

        {hiddenCount > 0 && (
          <p className="text-[13px] text-fg-3">
            {hiddenCount} post{hiddenCount === 1 ? '' : 's'} for brands that are no longer active {hiddenCount === 1 ? 'is' : 'are'} hidden from this view.
          </p>
        )}

        {/* Fallback: the normal route is Cowork scheduling approved posts. */}
        <details className="rounded-xl border border-line-2 bg-panel">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-fg-2">
            Fallback: schedule approved posts from the hub
          </summary>
          <div className="space-y-3 p-4 pt-0">
            <p className="text-[13px] text-fg-3">
              Normally Cowork schedules approved posts in Blotato. If it cannot, this does the same from here.
              A post whose slot has passed today goes out in 10 minutes. A post for a day that is already over is skipped, never moved a week later.
            </p>
            <button
              onClick={pushFromHub}
              disabled={isBusy || counts.approved === 0}
              className="rounded-lg bg-accent hover:brightness-125 text-on-solid px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy === 'push' ? 'Scheduling…' : `Schedule ${counts.approved} approved from the hub`}
            </button>
            {pushSummary && (
              <div className={`rounded-lg border px-4 py-3 space-y-1 text-[13px] ${pushSummary.failed === 0 && pushSummary.skipped === 0 ? 'border-ok/60 bg-ok/15 text-ok' : 'border-warn/60 bg-warn/15 text-warn'}`}>
                <p className="font-semibold">
                  {pushSummary.pushed} scheduled
                  {pushSummary.failed > 0 ? ` · ${pushSummary.failed} failed` : ''}
                  {pushSummary.skipped > 0 ? ` · ${pushSummary.skipped} skipped` : ''}
                </p>
                {pushSummary.results.filter(r => r.status !== 'pushed').map(r => (
                  <p key={r.id}>{r.status === 'failed' ? '✗' : '–'} {SITE_LABELS[r.siteId] ?? r.siteId} · {r.day} {r.platform}: {r.error ?? r.status}</p>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
