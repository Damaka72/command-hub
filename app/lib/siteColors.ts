// ── Site colour system (UX spec §2.1) ────────────────────────────────────────
// Each site owns one accent used consistently everywhere: ring, panel spine,
// status pill, calendar card border, month dot. An accent is only ever used
// for site identity — status uses the semantic set in globals.css and never a
// site accent.

export interface SiteColor {
  key:    string; // short badge label, e.g. "MYCP"
  name:   string;
  accent: string; // CSS colour: a var(--site-…) token defined in globals.css (dots, borders, fills)
  text:   string; // the accent lightened until it reads as text (≥4.5:1) on every surface
  tint:   string; // accent at 12% alpha, for backgrounds/fades
}

/** The colour at a given strength (0–100), for borders, glows and washes. */
export function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

const make = (key: string, name: string, token: string): SiteColor => {
  const accent = `var(--site-${token})`;
  return { key, name, accent, text: `color-mix(in srgb, ${accent} 60%, var(--fg))`, tint: alpha(accent, 12) };
};

export const SITE_COLORS: Record<string, SiteColor> = {
  masteryourcareerpath: make('MYCP',  'Master Your Career Path', 'masteryourcareerpath'),
  'world-of-contracts': make('WOC',   'World of Contracts',      'world-of-contracts'),
  'the-naija-food-guide': make('NFG', 'The Naija Food Guide',    'the-naija-food-guide'),
  oldoaktown:           make('OOT',   'Old Oak Town',            'oldoaktown'),
  aiviralvideoprompts:  make('AIVVP', 'AI Viral Video Prompts',  'aiviralvideoprompts'),
  didianolue:           make('DIDA',  'didianolue.co.uk',        'didianolue'),
};

// The four sites that run the content pipeline and own content_library rows.
// didianolue is handled personally and has no pipeline content.
export const PIPELINE_SITE_ORDER = [
  'masteryourcareerpath',
  'oldoaktown',
  'aiviralvideoprompts',
];

export function siteColor(siteId: string): SiteColor {
  return SITE_COLORS[siteId] ?? make(siteId.slice(0, 4).toUpperCase(), siteId, 'fallback');
}
