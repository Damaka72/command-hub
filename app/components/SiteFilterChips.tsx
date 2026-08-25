'use client';

import { useSiteFilter } from '../context/SiteFilterContext';
import { siteColor } from '../lib/siteColors';

// All + one per site, each with a colour dot (UX spec §4.1). Backed by
// SiteFilterContext so a site chosen here carries into other pages.

export default function SiteFilterChips({ siteIds }: { siteIds: string[] }) {
  const { siteId, setSiteId } = useSiteFilter();

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by site">
      <button
        type="button"
        onClick={() => setSiteId('')}
        className="rounded-full px-3 py-1 text-xs font-medium transition-all"
        style={siteId === ''
          ? { background: 'var(--hub-accent-dim)', color: 'var(--hub-accent-text)', border: '1px solid var(--line-2)' }
          : { background: 'var(--panel-2)', color: 'var(--fg-2)', border: '1px solid var(--line)' }
        }
      >
        All
      </button>
      {siteIds.map(id => {
        const c = siteColor(id);
        const active = siteId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSiteId(active ? '' : id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
            style={{
              background: active ? c.tint : 'var(--panel-2)',
              color: active ? c.accent : 'var(--fg-2)',
              border: `1px solid ${active ? c.accent + '60' : 'var(--line)'}`,
            }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} aria-hidden="true" />
            {c.key}
          </button>
        );
      })}
    </div>
  );
}
