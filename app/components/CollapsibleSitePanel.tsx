'use client';

import SiteCard, { type Site } from './SiteCard';
import ProgressRing from './ui/ProgressRing';
import StatusPill from './ui/StatusPill';
import { siteColor } from '@/app/lib/siteColors';
import type { SiteDetail, DraftItem } from '../api/status/route';
import type { HomeSiteStat } from '../api/home/route';

// Replaces the stacked site cards on the home page (UX spec §3.4). The
// header is always visible (~68px) so every site fits above the fold;
// expanding reveals the new mini metric tiles + action row, followed by the
// existing rich site detail (revenue, agent/pipeline status, marketing plan,
// breaking news, technical links) nested unchanged — nothing from the old
// card is lost, it's just one level deeper.

function MetricTile({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
      <span className="text-[12px] uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span className="mono-num text-sm font-semibold" style={{ color: color ?? 'var(--fg)' }}>{value}</span>
    </div>
  );
}

function relativeNextOut(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function focusAddTask(siteId: string, wasOpen: boolean, openPanel: () => void) {
  if (!wasOpen) openPanel();
  const run = () => {
    const el = document.getElementById(`task-input-${siteId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el as HTMLInputElement | null)?.focus();
  };
  // Give the collapse animation a moment if we just opened it.
  if (wasOpen) run();
  else setTimeout(run, 320);
}

export default function CollapsibleSitePanel({
  site,
  status,
  homeStat,
  reviewQueue,
  week,
  open,
  onToggle,
}: {
  site: Site;
  status?: SiteDetail;
  homeStat?: HomeSiteStat;
  reviewQueue: DraftItem[];
  week: string;
  open: boolean;
  onToggle: () => void;
}) {
  const c = siteColor(site.id);
  const pct = homeStat?.pct ?? 0;
  const inReview = homeStat?.inReview ?? 0;
  const panelId = `site-panel-${site.id}`;

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-110"
        style={{ minHeight: 68, borderLeft: `3px solid ${c.accent}` }}
      >
        <ProgressRing size={46} pct={pct} label={`${c.name} pushed this week`} color={c.accent} animate={false} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{site.name}</span>
          </div>
          <p className="truncate text-xs" style={{ color: 'var(--fg-3)' }}>
            {homeStat?.theme ?? 'No theme set for this week'}
          </p>
        </div>

        {inReview > 0 && (
          <StatusPill tone="warn" label={`${inReview} in review`} tint={{ accent: c.accent, tint: c.tint }} />
        )}

        <span
          className="shrink-0 text-xs transition-transform"
          style={{ color: 'var(--fg-3)', transform: open ? 'rotate(180deg)' : 'none' }}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      <div id={panelId} className={`hub-collapse-grid ${open ? 'hub-collapse-open' : ''}`}>
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div className="flex flex-col gap-4 px-4 pb-4" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>

            {/* Mini metric tiles */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Planned" value={homeStat?.planned ?? '—'} />
              <MetricTile label="Pushed" value={homeStat?.pushed ?? '—'} color={homeStat && homeStat.pushed > 0 ? 'var(--ok)' : undefined} />
              <MetricTile label="Needs media" value={homeStat?.needsMedia ?? '—'} color={homeStat && homeStat.needsMedia > 0 ? 'var(--warn)' : undefined} />
              <MetricTile label="Next out" value={relativeNextOut(homeStat?.nextOut ?? null)} />
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/library?view=week&site=${site.id}&week=${week}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: c.tint, color: c.accent, border: `1px solid ${c.accent}40` }}
              >
                Week view →
              </a>
              <a
                href={`/review?week=${week}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--panel-2)', color: 'var(--fg-2)', border: '1px solid var(--line)' }}
              >
                Review queue
              </a>
              <a
                href={`/plan?week=${week}`}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--panel-2)', color: 'var(--fg-2)', border: '1px solid var(--line)' }}
              >
                Edit plan
              </a>
              <button
                type="button"
                onClick={() => focusAddTask(site.id, open, onToggle)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:brightness-125"
                style={{ background: 'var(--panel-2)', color: 'var(--fg-2)', border: '1px solid var(--line)' }}
              >
                Add task
              </button>
            </div>

            {/* Full existing site detail — unchanged, nested one level deeper */}
            <SiteCard site={site} status={status} reviewQueue={reviewQueue} />
          </div>
        </div>
      </div>
    </div>
  );
}
