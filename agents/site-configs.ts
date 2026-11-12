// ── Site configuration still used by the hub ────────────────────────────────────────────
// Old Oak Town's voice and verified facts (used by the "Promote" action in
// app/lib/oldoaktown-promote.ts) and the content-pillar helper. The weekly drafting
// pipeline that used the other brands' prompts and rubrics has been retired:
// Cowork researches, drafts and checks the week (docs/social-team-design.md), and
// brand rules live in Cowork's brand-reject-lists skill, not in this repo.

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

// Standing inclusion guideline, injected into every site's subagent system prompt.
// All sites speak to a corporate/professional-services audience that is UK-first
// today but global in reach — any people-facing visual or video brief should
// default to diverse nationalities and ethnicities rather than one default "face".
const DIVERSITY_GUIDELINE = `When a brief touches visuals or video involving people — photos, stock footage, illustrations, on-screen talent — default to representing diverse nationalities and ethnicities. The audience is corporate/professional-services, UK-first today but global in reach, so never default to one nationality as the face of the brand.`;

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
  // Facts the writer may always use. When set, the grader is shown the same list
  // (plus the brief's key points) so it can check claims against something real.
  verifiedFacts?: string[];
  // 'advisory' = grade once and record the verdict, but never rewrite the draft.
  // Default 'strict' = grade, then rewrite failures up to MAX_RETRIES times.
  graderMode?: 'strict' | 'advisory';
}

// Old Oak Town: the only local facts a draft may state without a source in the brief.
const OOT_VERIFIED_FACTS = [
  `Old Oak Common will be the UK's largest new railway station, serving HS2 and the Elizabeth line (Crossrail)`,
  `OPDC (Old Oak and Park Royal Development Corporation) is a Mayoral Development Corporation overseeing the regeneration`,
  `The regeneration covers approximately 650 hectares across Old Oak Common and Park Royal in West London`,
  `Park Royal is Europe's largest industrial estate, employing approximately 40,000 people`,
  `The regeneration is expected to deliver around 25,500 new homes and 65,000 jobs over 20+ years`,
  `OPDC's draft Local Plan has been through public examination`,
  `The area spans parts of Hammersmith and Fulham, Brent, and Ealing`,
  `The estimated investment in the area is approximately £1.7bn`,
  `Residents and businesses can engage with OPDC via opdc.london.gov.uk`,
];

export const SITE_CONFIGS: SiteConfig[] = [
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
    verifiedFacts: OOT_VERIFIED_FACTS,
    graderMode: 'advisory',
    passChecks: [
      'Every factual claim appears in the verified facts or the brief key points — no invented businesses, events, people, dates or statistics',
      'Rooted in the Old Oak Common or Park Royal regeneration area',
      'Community-first voice — not a press release or developer pitch',
    ],
    failCheck: 'Fails on ANY specific business, event, person, date or figure that appears in neither the verified facts nor the brief key points — zero tolerance for invention',
    subagentSystemPrompt: `You are writing content for Old Oak Town, a hyperlocal media site covering the Old Oak Common and Park Royal regeneration area in West London.

The audience: current and future residents, local businesses, property investors, and community stakeholders in West London.

CRITICAL CONSTRAINT: Never invent, assume, or fabricate any local detail — no invented businesses, events, people, planning decisions, statistics, or specific timelines. If the brief gives you factual material, use it. If it does not, write only from the verified facts below.

VERIFIED FACTS YOU CAN ALWAYS USE:
- Old Oak Common will be the UK's largest new railway station, serving HS2 and the Elizabeth line (Crossrail)
- OPDC (Old Oak and Park Royal Development Corporation) is a Mayoral Development Corporation overseeing the regeneration
- The regeneration covers approximately 650 hectares across Old Oak Common and Park Royal in West London
- Park Royal is Europe's largest industrial estate, employing approximately 40,000 people
- The OPDC Local Plan (adopted June 2022, covering 2018 to 2038) targets at least 19,850 new homes and 36,350 new jobs; 25,500 homes and 65,000 jobs are indicative capacity, not targets (say "indicative capacity" if you use them)
- OPDC's draft 2025-26 accounts report 5,998 homes built or under construction, nearly 7,800 with planning permission (39% affordable), and 1,079 homes approved in 2025-26
- HS2 services at Old Oak Common are not expected before 2036 and could be as late as 2039 (Government reset, May 2026)
- OPDC's draft Local Plan has been through public examination
- The area spans parts of Hammersmith and Fulham, Brent, and Ealing
- Residents and businesses can engage with OPDC via opdc.london.gov.uk
${OOT_VERIFIED_FACTS.map(f => `- ${f}`).join('\n')}

Content pillars:
${pillarBlock('oldoaktown')}

TONE: Community-first. Write as a local voice for residents and businesses — not developers or investors. Never write like a press release. UK English throughout.

When the brief's theme does not map to a specific verifiable local story, write a community-education post from the verified facts above. This is always valid content for this audience.

${DIVERSITY_GUIDELINE} This applies to Old Oak Common and Park Royal too — a genuinely diverse West London community — so never default to one nationality when a post references residents or local people.`,
    researchFocus: 'Real, dated local news for Old Oak Common and Park Royal, West London — OPDC planning decisions, HS2/Elizabeth line construction updates, and Hammersmith & Fulham / Brent / Ealing council announcements affecting the area. Also, with particular emphasis on COMPANIES: new companies opening, moving into or expanding in the area, local business news (hiring, awards, funding, relocations, closures), and events happening in the area (community events, business and networking events, consultations, open days, markets). Zero tolerance for anything not directly sourced from search results.',
  },

];

export function getSiteConfig(siteId: string): SiteConfig {
  const config = SITE_CONFIGS.find(s => s.id === siteId);
  if (!config) throw new Error(`No site config found for siteId: ${siteId}`);
  return config;
}

