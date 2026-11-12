'use client';

// A post as one line (day, platform, first sentence), expanding to the full card on
// click. Used where there are many posts and the decision is easy (ready, not yet
// checked), so a whole week does not become a wall of text boxes.

import type { ReviewRow } from './classify';
import { hasMedia } from './classify';

const LAYER_LABEL: Record<string, string> = { base: 'Base', focus: 'Focus', flex: 'Flex' };

function firstLine(row: ReviewRow): string {
  const text = (row.edited_content ?? row.content) ?? '';
  const line = text.split('\n').map(l => l.trim()).find(l => l.length > 0) ?? '';
  return line.replace(/^HOOK:\s*/i, '');
}

export default function CompactRow({
  row, siteLabel, children,
}: {
  row: ReviewRow;
  siteLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-xl border border-line-2 bg-panel">
      <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center gap-3 text-sm">
        <span className="w-24 sm:w-32 shrink-0 font-medium text-fg">
          {row.day_name.slice(0, 3)} · {row.platform}
        </span>
        {siteLabel && <span className="hidden sm:inline shrink-0 text-fg-3 text-[13px]">{siteLabel}</span>}
        <span className="min-w-0 flex-1 truncate text-fg-2">{firstLine(row)}</span>
        {row.layer && LAYER_LABEL[row.layer] && (
          <span className="hidden sm:inline shrink-0 rounded-full bg-panel-3 px-2 py-0.5 text-[12px] text-fg-2">{LAYER_LABEL[row.layer]}</span>
        )}
        {hasMedia(row) && (
          <span className="shrink-0 rounded-full bg-panel-3 px-2 py-0.5 text-[12px] text-fg-2">media</span>
        )}
      </summary>
      <div className="p-3 pt-0">{children}</div>
    </details>
  );
}
