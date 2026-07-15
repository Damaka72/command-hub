export const SITE_SHORT: Record<string, string> = {
  oldoaktown:              'OOT',
  theconcurrentcontractor: 'TCC',
  masteryourcareerpath:    'MYCP',
  aiviralvideoprompts:     'AIVVP',
  didianolue:              'Didi',
};

// ── Newsletter publications ──────────────────────────────────────────────────
// Single source of truth for the newsletter workspace and its API route. Each
// publication draws its research briefs and content-library source material from
// one or more sites. The Pathway blends MYCP with TCC's research feed.
export interface Publication {
  slug:    'the-prompt-ly' | 'the-pathway' | 'the-oak';
  title:   string;
  siteIds: string[];
}

export const PUBLICATIONS: Publication[] = [
  { slug: 'the-prompt-ly', title: 'The Prompt-ly', siteIds: ['aiviralvideoprompts'] },
  { slug: 'the-pathway',   title: 'The Pathway',   siteIds: ['masteryourcareerpath', 'theconcurrentcontractor'] },
  { slug: 'the-oak',       title: 'The Oak',       siteIds: ['oldoaktown'] },
];

export const PUBLICATION_SLUGS = PUBLICATIONS.map(p => p.slug);
