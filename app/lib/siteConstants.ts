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
//
// `audience` and `voice` describe the newsletter's own editorial identity (not
// any single site's) and seed the draft-generation prompt in
// app/api/newsletters/draft/route.ts. They are derived from the underlying site
// configs in agents/site-configs.ts but kept here so the web route needs no
// dependency on the CI agent bundle.
export interface Publication {
  slug:     'the-prompt-ly' | 'the-pathway' | 'the-oak';
  title:    string;
  siteIds:  string[];
  audience: string;
  voice:    string;
}

export const PUBLICATIONS: Publication[] = [
  {
    slug:     'the-prompt-ly',
    title:    'The Prompt-ly',
    siteIds:  ['aiviralvideoprompts'],
    audience: 'Content creators, social media marketers, and small business owners who want high-performing AI-generated video content — more views, more engagement, more growth.',
    voice:    'Energetic, creative, results-focused. Show, don\'t tell. Practical prompts and examples over theory.',
  },
  {
    slug:     'the-pathway',
    title:    'The Pathway',
    siteIds:  ['masteryourcareerpath', 'theconcurrentcontractor'],
    audience: 'Action-oriented professionals taking control of their careers: graduates, early-to-mid-career people levelling up, career changers, and experienced UK contractors optimising how they work.',
    voice:    'Encouraging, practical and aspirational without motivational fluff; straight-talking and peer-to-peer, never preachy or advisory.',
  },
  {
    slug:     'the-oak',
    title:    'The Oak',
    siteIds:  ['oldoaktown'],
    audience: 'Current and future residents, local businesses, property investors, and community stakeholders in the Old Oak Common and Park Royal area of West London.',
    voice:    'Community-first, factual and local — never corporate. Grounded in what is actually happening in the area.',
  },
];

export const PUBLICATION_SLUGS = PUBLICATIONS.map(p => p.slug);
