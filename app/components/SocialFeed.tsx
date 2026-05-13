"use client";

import { useEffect, useState } from "react";
import type { BlotatoPost, BlotatoData } from "../api/blotato/route";

// ── Platform badge colours ────────────────────────────────────────────────────

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  twitter:   { bg: 'bg-sky-100 dark:bg-sky-900/30',     text: 'text-sky-700 dark:text-sky-300',     label: 'X / Twitter' },
  instagram: { bg: 'bg-pink-100 dark:bg-pink-900/30',   text: 'text-pink-700 dark:text-pink-300',   label: 'Instagram'   },
  facebook:  { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   label: 'Facebook'    },
  linkedin:  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', label: 'LinkedIn' },
  tiktok:    { bg: 'bg-zinc-100 dark:bg-zinc-700',       text: 'text-zinc-700 dark:text-zinc-200',   label: 'TikTok'      },
  youtube:   { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-300',     label: 'YouTube'     },
};

function PlatformBadge({ platform }: { platform: string }) {
  const s = PLATFORM_STYLES[platform.toLowerCase()] ?? {
    bg: 'bg-zinc-100 dark:bg-zinc-700',
    text: 'text-zinc-600 dark:text-zinc-300',
    label: platform,
  };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
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
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/60">
      {/* top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlatformBadge platform={post.platform} />
          {isScheduled && (
            <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Scheduled
            </span>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">{timeLabel}</span>
      </div>

      {/* post text */}
      {excerpt && (
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-line">{excerpt}</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-zinc-200 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
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
          className="self-start text-[10px] font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          View post ↗
        </a>
      )}

      {/* error message */}
      {post.state.type === 'failed' && post.state.errorMessage && (
        <p className="rounded-md bg-red-50 px-2 py-1 text-[10px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
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
      <div className="flex items-center gap-2 py-2 text-xs text-zinc-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-300 dark:bg-zinc-600" />
        Loading posts…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-500 dark:text-red-400">
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
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        No posts in the last 7 days
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div className="flex items-center gap-3 text-xs">
        {scheduled.length > 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            {scheduled.length} scheduled
          </span>
        )}
        {scheduled.length > 0 && published.length > 0 && (
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
        )}
        {published.length > 0 && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {published.length} published
          </span>
        )}
        <span className="text-zinc-300 dark:text-zinc-700">·</span>
        <span className="text-zinc-400 dark:text-zinc-500">last 7 days</span>
      </div>

      {/* Scheduled posts */}
      {scheduled.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Scheduled
          </span>
          {scheduled.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Published posts */}
      {published.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Published
          </span>
          {published.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  );
}
