'use client';

// One post, as a card: what it says, why the Brand gate said what it said,
// its media, and the few things Didi can do with it. Edits are held locally
// until Save, so typing never fires a request.

import { useState } from 'react';
import { BUCKET_LABEL, MEDIA_PLATFORMS, hasMedia, type Bucket, type ReviewRow } from './classify';

const PILL: Record<Bucket, string> = {
  ready:       'bg-ok/15 text-ok',
  flagged:     'bg-warn/15 text-warn',
  blocked:     'bg-bad/15 text-bad',
  failed:      'bg-bad/15 text-bad',
  unchecked:   'bg-panel-3 text-fg-2',
  needs_media: 'bg-warn/15 text-warn',
  filming:     'bg-warn/15 text-warn',
  approved:    'bg-ok/15 text-ok',
  scheduled:   'bg-accent-dim text-accent-text',
  rejected:    'bg-panel-3 text-fg-3',
};

const LAYER_LABEL: Record<string, string> = { base: 'Base', focus: 'Focus', flex: 'Flex' };

function agoLabel(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function parseMediaUrls(raw: string): string[] {
  return raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

// Inline preview of the first media URL. Falls back to a plain link if the
// asset type is unknown or the URL will not render.
function MediaPreview({ row }: { row: ReviewRow }) {
  const [broken, setBroken] = useState(false);
  const url = (row.media_urls ?? [])[0];
  if (!url) return null;

  if (!broken && row.asset_type === 'video') {
    return (
      <video
        src={url}
        controls
        muted
        className="w-full max-w-[220px] rounded-lg border border-line-2 bg-bg"
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
        className="max-h-[160px] rounded-lg border border-line-2 object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-text hover:underline break-all">
      {url}
    </a>
  );
}

export interface PostCardProps {
  row:              ReviewRow;
  bucket:           Bucket;
  siteLabel?:       string;   // shown when a list mixes brands
  busy:             boolean;
  onSave:           (row: ReviewRow, text: string, mediaUrls: string[]) => void;
  onApprove:        (id: string) => void;
  onReject:         (id: string) => void;
  onRequestCreation:(id: string) => void;
}

export default function PostCard({
  row, bucket, siteLabel, busy, onSave, onApprove, onReject, onRequestCreation,
}: PostCardProps) {
  const [text, setText]   = useState(row.edited_content ?? row.content);
  const [media, setMedia] = useState((row.media_urls ?? []).join('\n'));

  const locked      = bucket === 'scheduled';
  const mediaNeeded = MEDIA_PLATFORMS.has(row.platform);
  const dirty       = text !== (row.edited_content ?? row.content)
                   || media !== (row.media_urls ?? []).join('\n');
  const canApprove  = !locked && bucket !== 'blocked' && bucket !== 'approved';
  const approveLabel = bucket === 'filming' ? 'Approve script' : 'Approve';

  return (
    <div className="bg-panel border border-line-2 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {siteLabel && <><span className="font-medium text-fg">{siteLabel}</span><span className="text-fg-3">·</span></>}
          <span className="font-medium text-fg">{row.day_name}</span>
          <span className="text-fg-3">·</span>
          <span className="text-fg">{row.platform}</span>
          {row.layer && LAYER_LABEL[row.layer] && (
            <span className="rounded-full bg-panel-3 px-2 py-0.5 text-[12px] text-fg-2">{LAYER_LABEL[row.layer]}</span>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${PILL[bucket]}`}>
          {BUCKET_LABEL[bucket]}
        </span>
      </div>

      {(bucket === 'flagged' || bucket === 'blocked') && (
        <div className={`rounded-lg border px-3 py-2 text-[13px] ${bucket === 'blocked' ? 'border-bad/60 bg-bad/15 text-bad' : 'border-warn/60 bg-warn/15 text-warn'}`}>
          <p className="font-semibold uppercase tracking-wide text-[12px] mb-0.5">
            {bucket === 'blocked' ? 'Blocked: fix before it can be approved' : 'Check this before approving'}
          </p>
          <p>{row.gate_reason ?? 'No reason recorded.'}</p>
          {bucket === 'blocked' && (
            <p className="mt-1 opacity-80">Edit the wording and save. The edit goes back to the Brand gate for a re-check.</p>
          )}
        </div>
      )}

      {bucket === 'unchecked' && (
        <p className="text-[13px] text-fg-3">The Brand gate has not checked this yet.</p>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={locked}
        rows={Math.min(10, Math.max(3, Math.ceil(text.length / 80) + text.split('\n').length))}
        aria-label={`${row.day_name} ${row.platform} post text`}
        className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-accent/70 disabled:opacity-70"
      />

      {hasMedia(row) && (
        <div className="flex items-center gap-3 flex-wrap">
          <MediaPreview row={row} />
          {row.creation_tool && (
            <span className="text-[13px] text-fg-3">
              {row.asset_type ?? 'asset'} · {row.creation_tool}
              {row.aspect_ratio ? ` · ${row.aspect_ratio}` : ''}
              {row.asset_duration_s ? ` · ${Math.round(row.asset_duration_s)}s` : ''}
            </span>
          )}
        </div>
      )}

      {bucket === 'filming' && (
        <p className="text-[13px] text-warn">
          This is a script and shot list for you to film. Cowork cannot make it. Film it, upload the video,
          and paste the link below, or leave it and it will not publish.
        </p>
      )}

      {mediaNeeded && !locked && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="block text-[13px] uppercase tracking-wide text-fg-2">
              Media links {hasMedia(row) ? '' : <span className="text-warn">· required for {row.platform}</span>}
            </label>
            {!hasMedia(row) && bucket !== 'filming' && (
              row.creation_requested_at ? (
                <span className="text-[13px] text-warn shrink-0">
                  Asked Cowork {agoLabel(row.creation_requested_at)}. It picks this up on its next media run.
                </span>
              ) : (
                <button
                  onClick={() => onRequestCreation(row.id)}
                  disabled={busy}
                  className="rounded-lg bg-warn hover:brightness-125 text-on-solid px-2.5 py-1 text-[13px] font-medium disabled:opacity-50 shrink-0"
                >
                  Ask Cowork to create it
                </button>
              )
            )}
          </div>
          <textarea
            value={media}
            onChange={e => setMedia(e.target.value)}
            rows={2}
            placeholder="https://…/image.jpg (one per line; a video link posts as a reel on Instagram)"
            aria-label={`${row.day_name} ${row.platform} media links`}
            className="w-full bg-panel-2 border border-line-2 rounded-lg px-3 py-2 text-fg text-xs font-mono focus:outline-none focus:border-accent/70"
          />
        </div>
      )}

      {bucket === 'scheduled' && (
        <p className="text-xs text-accent-text">
          Scheduled{row.scheduled_for ? ` for ${new Date(row.scheduled_for).toLocaleString('en-GB')}` : ''}
          {row.blotato_submission_id ? ` · id ${row.blotato_submission_id}` : ''}
        </p>
      )}
      {!locked && row.push_error && bucket !== 'blocked' && bucket !== 'flagged' && (
        <p className="text-xs text-bad">{bucket === 'rejected' ? 'Reason: ' : 'Problem: '}{row.push_error}</p>
      )}

      {!locked && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSave(row, text, parseMediaUrls(media))}
            disabled={busy || !dirty}
            className="rounded-lg bg-panel-3 hover:brightness-125 text-fg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Save{dirty ? ' changes' : ''}
          </button>
          {canApprove && (
            <button
              onClick={() => onApprove(row.id)}
              disabled={busy || dirty}
              title={dirty ? 'Save your changes first' : undefined}
              className="rounded-lg bg-ok hover:brightness-125 text-on-solid px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              {approveLabel}
            </button>
          )}
          {bucket !== 'rejected' && (
            <button
              onClick={() => onReject(row.id)}
              disabled={busy}
              className="rounded-lg bg-bad/15 hover:brightness-125 text-bad px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
