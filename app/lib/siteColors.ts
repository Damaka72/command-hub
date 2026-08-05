// ── Site colour system (UX spec §2.1) ────────────────────────────────────────
// Each site owns one accent used consistently everywhere: ring, panel spine,
// status pill, calendar card border, month dot. An accent is only ever used
// for site identity — status uses the semantic set in globals.css and never a
// site accent.

export interface SiteColor {
  key:    string; // short badge label, e.g. "MYCP"
  name:   string;
  accent: string; // solid hex
  tint:   string; // accent at 14% alpha, for backgrounds/fades
}

export const SITE_COLORS: Record<string, SiteColor> = {
  masteryourcareerpath:    { key: 'MYCP',  name: 'Master Your Career Path', accent: '#3b82f6', tint: '#3b82f61f' },
  theconcurrentcontractor: { key: 'TCC',   name: 'The Concurrent Contractor', accent: '#f59e0b', tint: '#f59e0b1f' },
  oldoaktown:              { key: 'OOT',   name: 'Old Oak Town', accent: '#22c55e', tint: '#22c55e1f' },
  aiviralvideoprompts:     { key: 'AIVVP', name: 'AI Viral Video Prompts', accent: '#a855f7', tint: '#a855f71f' },
  didianolue:               { key: 'DIDA',  name: 'didianolue.co.uk', accent: '#ec4899', tint: '#ec48991f' },
};

export const SITE_ORDER_ALL = [
  'masteryourcareerpath',
  'theconcurrentcontractor',
  'oldoaktown',
  'aiviralvideoprompts',
  'didianolue',
];

// The four sites that run the content pipeline and own content_library rows.
// didianolue is handled personally and has no pipeline content.
export const PIPELINE_SITE_ORDER = [
  'masteryourcareerpath',
  'theconcurrentcontractor',
  'oldoaktown',
  'aiviralvideoprompts',
];

export function siteColor(siteId: string): SiteColor {
  return SITE_COLORS[siteId] ?? { key: siteId.slice(0, 4).toUpperCase(), name: siteId, accent: '#64748b', tint: '#64748b1f' };
}
