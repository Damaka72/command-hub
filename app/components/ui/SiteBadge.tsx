import { siteColor } from '@/app/lib/siteColors';

// Small coloured dot + short key label used in filter chips, calendar cards
// and anywhere a site needs to be identified at a glance (UX spec §2.1).

export default function SiteBadge({ siteId, showName = false }: { siteId: string; showName?: boolean }) {
  const c = siteColor(siteId);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: c.accent, boxShadow: `0 0 6px ${c.accent}80` }}
        aria-hidden="true"
      />
      <span className="mono-num text-[12px] font-semibold uppercase tracking-wide" style={{ color: c.accent }}>
        {showName ? c.name : c.key}
      </span>
    </span>
  );
}
