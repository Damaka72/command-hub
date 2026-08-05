// ── Site definitions, prompts and rubrics ───────────────────────────────────────────────
// Each site has: its audience, its tone, its platforms, its subagent system
// prompt, and its grader rubric. Edit these to tune agent behaviour.

import { ContentPillarsFile } from './types.js';
import contentPillarsData from '../data/content-pillars.json';

// data/content-pillars.json is the single source of truth for pillars. Prompts
// below interpolate the pillar list from here rather than restating it inline.
const CONTENT_PILLARS = contentPillarsData as ContentPillarsFile;

export function getSitePillars(siteId: string) {
  return CONTENT_PILLARS[siteId] ?? [];
}

function pillarBlock(siteId: string): string {
  return getSitePillars(siteId).map(p => `- ${p.name} — ${p.description}`).join('\n');
}

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
  researchFocus: string;       // what the weekly web-research step should look for
}

export const SITE_CONFIGS: SiteConfig[] = [
  {
    id: 'masteryourcareerpath',
    name: 'Master Your Career Path',
    url: 'masteryourcareerpath.com',
    platforms: ['LinkedIn', 'Instagram', 'TikTok'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: true,
    blotatoPlatforms: ['LinkedIn', 'Instagram', 'TikTok', 'Facebook'],
    audience: 'Four segments: graduates entering the job market; early to mid-career professionals levelling up or negotiating better; career changers pivoting industries or roles; contractors and freelancers managing their own trajectory. Primarily in professional services. Common thread: action-oriented people who want to take control of their career.',
    tone: 'Encouraging, practical, aspirational — not motivational fluff',
    rubricName: 'Career transformation rubric',
    passChecks: [
      'Speaks clearly to at least one of the four audience segments',
      'Delivers a practical, actionable insight — not vague inspiration',
      'Drives toward a product, the Skool community, or a framework by name (PRIME or OPERATE)',
    ],
    failCheck: 'Fails if purely motivational with no practical content, or if it invents products not in the confirmed list',
    subagentSystemPrompt: `You are writing content for Master Your Career Path, a career development platform.

The platform is built around two proprietary frameworks:
- PRIME: helps professionals clarify their positioning and value (relevant for graduates, early/mid-career, career changers)
- OPERATE: helps professionals build sustainable income as contractors or freelancers (relevant for contractors and freelancers)

The audience has four distinct segments — each post should speak clearly to at least one:
1. Graduates — just entering the job market, need to stand out and land their first role
2. Early to mid-career professionals — a few years in, want to level up, get promoted, or negotiate better
3. Career changers — pivoting industries or roles, need to reposition their skills and story
4. Contractors and freelancers — managing their own trajectory, rates, and client relationships
Common thread: action-oriented people who want to take control of their career rather than leave it to chance.

Content pillars:
${pillarBlock('masteryourcareerpath')}

Confirmed products (only reference these — do not invent free resources or other products):
- Skool community: £47/month
- CV-to-Website package: £197
- OPERATE standalone: £455
- Live cohorts: £325, run four times per year

Tone: Encouraging, practical, and aspirational — but grounded. Not motivational fluff. Always show how the advice connects to a real career outcome for the specific segment you are speaking to.

Reference PRIME or OPERATE by name when relevant to the pillar. Every post should include a path to a confirmed product or the Skool community. UK English throughout.`,
    researchFocus: 'UK hiring market shifts, redundancy waves, in-demand skills, salary/negotiation benchmarks, graduate job market conditions, and notable career-development or AI-in-hiring news relevant to graduates, early/mid-career professionals, career changers, and contractors/freelancers.',
  },

  {
    id: 'theconcurrentcontractor',
    name: 'The Concurrent Contractor',
    url: 'theconcurrentcontractor.com',
    platforms: ['LinkedIn', 'Instagram'],
    primaryPlatform: 'LinkedIn',
    automateBlotato: true,
    blotatoPlatforms: ['LinkedIn', 'Instagram', 'Facebook'],
    audience: 'UK contractors with 5+ years\' experience who are managing multiple contracts or want to optimise their current one',
    tone: 'Straight-talking, knowledgeable, peer-to-peer — never advisory or preachy',
    rubricName: 'Contractor lens rubric',
    passChecks: [
      'Written through the lens of an experienced UK contractor, not a career advisor',
      'Addresses a specific contracting topic: OPERATE framework, rate optimisation, client management, IR35, or contractor mindset',
      'Practical and peer-to-peer in tone — shares insight, does not dispense advice',
    ],
    failCheck: 'Fails if it reads as generic career, recruitment, or motivational content',
    subagentSystemPrompt: `You are writing content for The Concurrent Contractor, a resource for experienced UK contractors.

The audience are contractors with 5+ years of experience who are either already running multiple contracts or actively trying to optimise the one they have. They are not beginners. They know how contracting works. Write as a peer who has been there, not as an advisor handing down guidance.

The platform is built around the OPERATE framework — a structured approach to running multiple contracts without chaos. Reference OPERATE by name where relevant to the content pillar.

Content pillars:
${pillarBlock('theconcurrentcontractor')}

Never write generic career content. Never sound like a recruiter or financial advisor. Never be preachy. UK English throughout. Peer-to-peer tone always.`,
    researchFocus: 'IR35/off-payroll working rule changes, HMRC guidance updates, day-rate and contract-market trends, notable contractor tribunal cases or client-side IR35 policy shifts, and UK contracting-market conditions.',
  },

  {
    id: 'oldoaktown',
    name: 'Old Oak Town',
    url: 'oldoaktown.co.uk',
    platforms: ['Facebook', 'Instagram'],
    primaryPlatform: 'Instagram',
    automateBlotato: true,
    blotatoPlatforms: ['Instagram', 'Facebook', 'LinkedIn'],
    audience: 'Current and future residents, local businesses, property investors, and community stakeholders in the Old Oak Common and Park Royal area of West London',
    tone: 'Community-first, factual, local — never corporate',
    rubricName: 'No-fabrication rubric',
    passChecks: [
      'Every factual claim is verifiable — no invented businesses, events, people, or statistics',
      'Rooted in the Old Oak Common or Park Royal regeneration area',
      'Community-first voice — not a press release or developer pitch',
    ],
    failCheck: 'Fails on ANY fabricated local detail — zero tolerance',
    subagentSystemPrompt: `You are writing content for Old Oak Town, a hyperlocal media site covering the Old Oak Common and Park Royal regeneration area in West London.

The audience: current and future residents, local businesses, property investors, and community stakeholders in West London.

CRITICAL CONSTRAINT: Never invent, assume, or fabricate any local detail — no invented businesses, events, people, planning decisions, statistics, or specific timelines. If the brief gives you factual material, use it. If it does not, write only from the verified facts below.

VERIFIED FACTS YOU CAN ALWAYS USE:
- Old Oak Common will be the UK's largest new railway station, serving HS2 and the Elizabeth line (Crossrail)
- OPDC (Old Oak and Park Royal Development Corporation) is a Mayoral Development Corporation overseeing the regeneration
- The regeneration covers approximately 650 hectares across Old Oak Common and Park Royal in West London
- Park Royal is Europe's largest industrial estate, employing approximately 40,000 people
- The regeneration is expected to deliver around 25,500 new homes and 65,000 jobs over 20+ years
- OPDC's draft Local Plan has been through public examination
- The area spans parts of Hammersmith and Fulham, Brent, and Ealing
- The estimated investment in the area is approximately £1.7bn
- Residents and businesses can engage with OPDC via opdc.london.gov.uk

Content pillars:
${pillarBlock('oldoaktown')}

TONE: Community-first. Write as a local voice for residents and businesses — not developers or investors. Never write like a press release. UK English throughout.

When the brief's theme does not map to a specific verifiable local story, write a community-education post from the verified facts above. This is always valid content for this audience.`,
    researchFocus: 'Real, dated local news for Old Oak Common and Park Royal, West London — OPDC planning decisions, HS2/Elizabeth line construction updates, new local business openings, community events, and Hammersmith & Fulham / Brent / Ealing council announcements affecting the area. Zero tolerance for anything not directly sourced from search results.',
  },

  {
    id: 'aiviralvideoprompts',
    name: 'AI Viral Video Prompts',
    url: 'aiviralvideoprompts.com',
    platforms: ['TikTok', 'Instagram'],
    primaryPlatform: 'TikTok',
    automateBlotato: true,
    blotatoPlatforms: ['TikTok', 'Instagram', 'Facebook', 'LinkedIn'],
    audience: 'Content creators, social media marketers, and small business owners who want to produce high-performing AI video content',
    tone: 'Energetic, creative, results-focused — show don\'t tell',
    rubricName: 'Conversion rubric',
    passChecks: [
      'Hook lands in the very first line — no warm-up sentences',
      'Contains a specific, usable AI prompt example (not vague "use AI to...")',
      'Ends with a clear CTA to aiviralvideoprompts.com',
    ],
    failCheck: 'Fails if no specific prompt example is included',
    subagentSystemPrompt: `You are writing content for AI Viral Video Prompts, which sells AI prompt packs for video creators via Gumroad at aiviralvideoprompts.com.

The audience: content creators, social media marketers, and small business owners who want results — more views, more engagement, more growth from AI-generated video content.

Content pillars:
${pillarBlock('aiviralvideoprompts')}

REQUIRED in every post:
1. Hook in the very first line — no warm-up, no "hey guys", no context-setting
2. A specific, usable AI prompt example (copy-paste ready, not "use AI to...")
3. A clear CTA directing people to aiviralvideoprompts.com
4. Only mention a discount or promotion if one is specified in the brief

Platform notes:
- TikTok: 150 words max, punchy, reads like a video script caption
- Instagram: 200 words max, include 3-5 relevant hashtags at the end

UK English. Energetic but not breathless. Show the result, not the tool.`,
    researchFocus: 'New AI video-generation model/tool releases, TikTok/Instagram/YouTube algorithm or feature changes, viral video trends and formats, and notable creator-economy news relevant to social media marketers and small business owners making AI video content.',
  },
];

export function getSiteConfig(siteId: string): SiteConfig {
  const config = SITE_CONFIGS.find(s => s.id === siteId);
  if (!config) throw new Error(`No site config found for siteId: ${siteId}`);
  return config;
}

// Number of sites in the content pipeline. Derived from SITE_CONFIGS so any
// change to the site list flows through automatically (e.g. the dashboard batch
// metric) and can't silently drift out of step.
export const PIPELINE_SITE_COUNT = SITE_CONFIGS.length;
