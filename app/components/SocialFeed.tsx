"use client";

import { useEffect, useState } from "react";
import type { BlotatoPost, BlotatoData } from "../api/blotato/route";

// ── Platform badge colours ────────────────────────────────────────────────────

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  twitter:   { bg: 'bg-accent-dim',     text: 'text-accent-text',     label: 'X / Twitter' },
  instagram: { bg: 'bg-accent-dim',   text: 'text-accent-text',   label: 'Instagram'   },
  facebook:  { bg: 'bg-accent-dim',   text: 'text-accent-text',   label: 'Facebook'    },
  linkedin:  { bg: 'bg-accent-dim', text: 'text-accent-text', label: 'LinkedIn' },
  tiktok:    { bg: 'bg-panel-3',       text: 'text-fg',   label: 'TikTok'      },
  youtube:   { bg: 'bg-bad/15',     text: 'text-bad',     label: 'YouTube'     },
};

function PlatformBadge({ platform }: { platform: string }) {
  const s = PLATFORM_STYLES[platform.toLowerCase()] ?? {
    bg: 'bg-panel-3',
    text: 'text-fg',
    label: platform,
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Friendly relative time ────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const abs  = Math.abs(diff);
  const future = diff < 0;
  const mins  = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days  = Math.round(abs / 86_400_000);

  let label: string;
  if      (mins  <  2)   label = 'just now';
  else if (mins  < 60)   label = `${mins}m`;
  else if (hours < 24)   label = `${hours}h`;
  else if (days  <  7)   label = `${days}d`;
  else {
    label = new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return future ? `in ${label}` : `${label} ago`;
}

// ── Single post card ──────────────────────────────────────────────────────────

function PostCard({ post }: { post: BlotatoPost }) {
  const isScheduled = post.state.type === 'scheduled';
  const excerpt     = post.text.length > 120 ? post.text.slice(0, 120).trimEnd() + '…' : post.text;
  const timeLabel   = relativeTime(post.postTime);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 border-line bg-panel-2/60">
      {/* top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlatformBadge platform={post.platform} />
          {isScheduled && (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide bg-warn/15 text-warn">
              Scheduled
            </span>
          )}
        </div>
        <span className="shrink-0 text-[12px] text-fg-3">{timeLabel}</span>
      </div>

      {/* post text */}
      {excerpt && (
        <p className="text-xs leading-relaxed text-fg whitespace-pre-line">{excerpt}</p>
      )}

      {/* media thumbnails */}
      {post.mediaUrls.length > 0 && (
        <div className="flex gap-1.5">
          {post.mediaUrls.slice(0, 3).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-12 w-12 rounded-md object-cover"
              loading="lazy"
            />
          ))}
          {post.mediaUrls.length > 3 && (
            <div className="flex h-12 w-12 items-center justify-center rounded-md text-[12px] font-medium bg-panel-3 text-fg-2">
              +{post.mediaUrls.length - 3}
            </div>
          )}
        </div>
      )}

      {/* live link */}
      {post.state.postUrl && (
        <a
          href={post.state.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-[12px] font-medium underline underline-offset-2 text-fg-2 hover:text-fg"
        >
          View post ↗
        </a>
      )}

      {/* error message */}
      {post.state.type === 'failed' && post.state.errorMessage && (
        <p className="rounded-md px-2 py-1 text-[12px] bg-bad/15 text-bad">
          {post.state.errorMessage}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SocialFeed({ siteId }: { siteId: string }) {
  const [data,    setData]    = useState<BlotatoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/blotato')
      .then(r => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json() as Promise<BlotatoData>;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-fg-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-panel-3" />
        Loading posts…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-bad">
        Could not load posts — {error}
      </p>
    );
  }

  const feed      = data?.bySite[siteId];
  const scheduled = feed?.scheduled ?? [];
  const published = feed?.published ?? [];
  const total     = scheduled.length + published.length;

  if (total === 0) {
    return (
      <p className="text-xs text-fg-3">
        No posts in the last 7 days
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div className="flex items-center gap-3 text-xs">
        {scheduled.length > 0 && (
          <span className="text-warn font-medium">
            {scheduled.length} scheduled
          </span>
        )}
        {scheduled.length > 0 && published.length > 0 && (
          <span className="text-fg-3">·</span>
        )}
        {published.length > 0 && (
          <span className="text-ok font-medium">
            {published.length} published
          </span>
        )}
        <span className="text-fg-3">·</span>
        <span className="text-fg-3">last 7 days</span>
      </div>

      {/* Scheduled posts */}
      {scheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-fg-3">
            Scheduled
          </span>
          {scheduled.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Published posts */}
      {published.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-fg-3">
            Published
          </span>
          {published.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}
