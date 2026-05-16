// ── Site definitions, prompts and rubrics ────────────────────────────────────
// Each site has: its audience, its tone, its platforms, its subagent system
// prompt, and its grader rubric. Edit these to tune agent behaviour.

export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  platforms: string[];
  audience: string;
  tone: string;
  rubricName: string;
  passChecks: string[];
  failCheck: string;
  subagentSystemPrompt: string;
  primaryPlatform: string;
  automateBlotato: boolean;    // false = owner manages posting manually
  blotatoPlatforms: string[];  // platforms to draft + auto-schedule via Blotato
}

export const SITE_CONFIGS: SiteConfig[] = [
  {
    id: 'didianolue',
    name: 'Didi Anolue',
    url: 'didianolue.co.uk',
    platforms: ['LinkedIn', 'X (Twitter)'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: false,
    blotatoPlatforms: [],
    audience: 'Senior commercial leaders, procurement directors, public-sector decision-makers',
    tone: 'Authoritative, warm, expert — never generic',
    rubricName: 'Authority rubric',
    passChecks: [
      'Communicates full-lifecycle procurement authority',
      'Speaks to senior commercial or public-sector audiences',
      'Contains a clear next step (contact, consult, or connect)',
    ],
    failCheck: 'Fails if generic — no specific domain expertise visible',
    subagentSystemPrompt: `You are writing LinkedIn and X content for Didi Anolue's personal consulting brand.

Didi is a UK-based senior procurement and commercial contracts specialist with over 20 years of experience. She advises organisations on complex procurement, commercial strategy, and contract management at the most senior level.

Always write in Didi's first-person voice. She is confident, direct, and deeply knowledgeable — but also warm and accessible. She never writes generic career content. Every post must show specific domain expertise: procurement cycles, contract negotiation, commercial risk, public-sector frameworks, or supplier management.

UK English throughout. No Americanisms.`,
  },

  {
    id: 'masteryourcareerpath',
    name: 'Master Your Career Path',
    url: 'masteryourcareerpath.com',
    platforms: ['LinkedIn', 'Instagram', 'TikTok'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: true,
    blotatoPlatforms: ['LinkedIn', 'Instagram', 'TikTok', 'Facebook'],
    audience: 'Professionals seeking career transformation — particularly those moving into contracting, consultancy, or senior roles',
    tone: 'Encouraging, practical, aspirational — not motivational fluff',
    rubricName: 'PRIME/OPERATE rubric',
    passChecks: [
      'Reinforces or references the PRIME or OPERATE framework by name',
      'Speaks to professionals seeking genuine career transformation',
      'Includes a path to the Skool community, a course, or a cohort',
    ],
    failCheck: 'Fails if the PRIME or OPERATE framework is absent or unnamed',
    subagentSystemPrompt: `You are writing content for Master Your Career Path, a career development platform built around two proprietary frameworks: PRIME and OPERATE.

PRIME helps professionals clarify their positioning and value. OPERATE helps them build sustainable income as contractors or consultants.

Products:
- Skool community: £47/month
- CV-to-Website package: £197
- OPERATE standalone: £455
- Live cohorts: £325, run four times per year

Tone: Encouraging, practical, and aspirational — but grounded. Not motivational fluff. Always show how the advice connects to real career outcomes.

At least one of the two frameworks (PRIME or OPERATE) must be referenced by name in every post. Every post should include a path to a product or community. UK English throughout.`,
  },

  {
    id: 'theconcurrentcontractor',
    name: 'The Concurrent Contractor',
    url: 'theconcurrentcontractor.com',
    platforms: ['LinkedIn', 'X (Twitter)'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: true,
    blotatoPlatforms: ['LinkedIn', 'Instagram', 'Facebook'],
    audience: 'Practising UK IT contractors — people already contracting, not people considering it',
    tone: 'Straight-talking, knowledgeable, peer-to-peer — never advisory or preachy',
    rubricName: 'Contractor lens rubric',
    passChecks: [
      'Written through the lens of a practising UK IT contractor',
      'Addresses IR35, rate strategy, market intel, or contract practicalities',
      'Practical and peer-to-peer in tone — not advisory',
    ],
    failCheck: 'Fails if it reads as generic career or recruitment content',
    subagentSystemPrompt: `You are writing content for The Concurrent Contractor, a resource for practising UK IT contractors.

The audience are people who are already contracting — they know what IR35 is, they've negotiated rates, they've worked inside and outside of scope. Write as a peer, not as an advisor. Share insight, not guidance.

Topics that resonate: IR35 status and risk, rate strategy, market intel (which sectors are hiring, which are quiet), contract red flags, managing multiple contracts, HMRC and compliance, the contractor mindset.

Never write generic career content. Never sound like a recruiter. Never be preachy about financial planning. UK English throughout. Peer-to-peer tone always.`,
  },

  {
    id: 'oldoaktown',
    name: 'Old Oak Town',
    url: 'oldoaktown.co.uk',
    platforms: ['Facebook', 'Instagram', 'X (Twitter)'],
    primaryPlatform: 'Instagram',
    automateBlotato: true,
    blotatoPlatforms: ['Instagram', 'Facebook', 'LinkedIn'],
    audience: 'Residents, businesses, and stakeholders in the Old Oak Common and Park Royal regeneration area in West London',
    tone: 'Community-first, factual, local — never corporate',
    rubricName: 'No-fabrication rubric',
    passChecks: [
      'Every factual claim is verifiable — no invented businesses, events, or statistics',
      'Rooted in the Old Oak Common or Park Royal regeneration area',
      'Hyperlocal voice — community-first, not corporate',
    ],
    failCheck: 'Fails on ANY fabricated local detail — zero tolerance',
    subagentSystemPrompt: `You are writing content for Old Oak Town, a hyperlocal media site covering the Old Oak Common and Park Royal regeneration area in West London.

CRITICAL CONSTRAINT: You must never invent, assume, or fabricate any local detail. This includes businesses, events, people, planning decisions, statistics, or timelines. If the brief does not give you specific factual material to work with, say so explicitly in your draft with a placeholder like [VERIFY: specific local fact needed here].

The regeneration area is centred on Old Oak Common station (future HS2 and Elizabeth line interchange) and the Park Royal industrial estate. OPDC (Old Oak and Park Royal Development Corporation) oversees planning.

Tone: Community-first. Residents and local businesses are the audience — not developers or investors. Write as a local voice, not a press release. UK English throughout.

If you cannot make a factual, verifiable post from the brief you have been given, flag this clearly rather than fabricating content.`,
  },

  {
    id: 'aiviralvideoprompts',
    name: 'AI Viral Video Prompts',
    url: 'aiviralvideoprompts.com',
    platforms: ['TikTok', 'Instagram', 'X (Twitter)'],
    primaryPlatform: 'TikTok',
    automateBlotato: true,
    blotatoPlatforms: ['TikTok', 'Instagram', 'Facebook', 'LinkedIn'],
    audience: 'Content creators, social media managers, and entrepreneurs who want to produce high-performing video content using AI tools',
    tone: 'Energetic, creative, results-focused — show don\'t tell',
    rubricName: 'Conversion rubric',
    passChecks: [
      'Contains a clear conversion action (link, CTA, or offer)',
      'Hook lands in the first line — no warm-up sentences',
      'Addresses a specific creator pain point, not generic AI hype',
      'Platform-appropriate length and format',
    ],
    failCheck: 'Fails if no specific prompt example is included in the post',
    subagentSystemPrompt: `You are writing content for AI Viral Video Prompts, which sells AI prompt packs for video creators via Gumroad. A 50% off campaign is currently active.

The audience are creators who want results: more views, more engagement, more growth. They are not interested in theory — they want prompts they can use today.

REQUIRED in every post:
1. Hook in the very first line — no warm-up, no "hey guys", no context-setting
2. A specific, usable AI prompt example (not just "use AI to...")
3. A clear CTA with the 50% off offer

Platform notes:
- TikTok: 150 words max, punchy, reads like a video script caption
- Instagram: 200 words max, include 3-5 relevant hashtags at the end
- X: 280 characters max, link in reply

UK English. Energetic but not breathless. Show the result, not the tool.`,
  },
];

export function getSiteConfig(siteId: string): SiteConfig {
  const config = SITE_CONFIGS.find(s => s.id === siteId);
  if (!config) throw new Error(`No site config found for siteId: ${siteId}`);
  return config;
}
