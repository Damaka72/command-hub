// ── Brand sheets ─────────────────────────────────────────────────────────────
// What anything needs to make an on-brand post, deck or infographic. The values
// live in data/brands/<siteId>.json (see data/brands/README.md); this file only
// gathers and types them. To add a brand: add its file, then one import and one
// array entry below.

import aiviralvideoprompts from '@/data/brands/aiviralvideoprompts.json';
import didianolue from '@/data/brands/didianolue.json';
import masteryourcareerpath from '@/data/brands/masteryourcareerpath.json';
import oldoaktown from '@/data/brands/oldoaktown.json';
import naija from '@/data/brands/the-naija-food-guide.json';
import woc from '@/data/brands/world-of-contracts.json';

export interface BrandColour { name: string; hex: string; role: string }
export interface BrandFont { family: string; weights: string; use: string; source: string }
export interface CardStyle { background: string; headline: string; accent: string; body: string; gradient?: string }

export interface BrandSheet {
  siteId:    string;
  name:      string;
  url:       string;
  tagline:   string;
  /** Where the values were read from. */
  source:    string;
  colours:   BrandColour[];
  fonts:     { display: BrandFont; body: BrandFont; mono?: BrandFont };
  /** Default look for a social card, with an optional opposite (light/dark). */
  card:      CardStyle & { alt?: CardStyle };
  voice:     string;
  imagery:   string[];
  logo:      string;
  doNot:     string[];
  /** Points only Didi can settle. */
  toConfirm: string[];
}

export const BRAND_SHEETS: BrandSheet[] = [
  masteryourcareerpath,
  oldoaktown,
  aiviralvideoprompts,
  woc,
  naija,
  didianolue,
];

export function brandSheet(siteId: string): BrandSheet | undefined {
  return BRAND_SHEETS.find(b => b.siteId === siteId);
}

/** Sizes every brand shares, in pixels. */
export const SOCIAL_SIZES: { name: string; size: string; use: string }[] = [
  { name: 'Square',    size: '1080 × 1080', use: 'Instagram and LinkedIn single posts' },
  { name: 'Portrait',  size: '1080 × 1350', use: 'Instagram and LinkedIn carousels (takes up most screen)' },
  { name: 'Vertical',  size: '1080 × 1920', use: 'Reels, TikTok, Shorts, Stories' },
  { name: 'Landscape', size: '1200 × 627',  use: 'LinkedIn link previews and X' },
  { name: 'Slide',     size: '1920 × 1080', use: 'Presentations' },
];

/** The brief to paste into Claude or Cowork so it uses a brand's look exactly. */
export function brandBrief(b: BrandSheet): string {
  const f = b.fonts;
  return [
    `Brand: ${b.name} (${b.url})`,
    `Colours: ${b.colours.map(c => `${c.name} ${c.hex} (${c.role})`).join('; ')}`,
    `Fonts: headlines in ${f.display.family} (${f.display.weights}); body in ${f.body.family} (${f.body.weights})${f.mono ? `; ${f.mono.family} for ${f.mono.use.toLowerCase()}` : ''}`,
    `Default card: background ${b.card.background}, headline ${b.card.headline}, accent ${b.card.accent}, body ${b.card.body}${b.card.gradient ? `, gradient ${b.card.gradient}` : ''}`,
    `Voice: ${b.voice}`,
    `Imagery: ${b.imagery.join(' ')}`,
    `Logo: ${b.logo}`,
    `Never: ${b.doNot.join(' ')}`,
  ].join('\n');
}
