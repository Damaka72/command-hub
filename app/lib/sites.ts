// ── Site metadata — SINGLE SOURCE OF TRUTH ──────────────────────────────────
// Extracted from app/page.tsx so both the dashboard and /social (and anything
// else that needs name/url per site (colours live in siteColors.ts / globals.css)) share one list instead of
// each keeping its own copy.

import type { Site } from "../components/SiteCard";

export const SITES: Site[] = [
  {
    id: "oldoaktown",
    name: "Old Oak Town",
    url: "oldoaktown.co.uk",
    description: "Hyperlocal news & community for Old Oak Common regeneration",
    github: "https://github.com/Damaka72/oldoaktown",
    admin: "https://oldoaktown.co.uk/admin",
    initials: "OO",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram',
        schedule: 'Daily, Monday to Saturday',
        nextAction: 'Approve this week\'s posts in the Sunday review; Cowork schedules them',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'The Oak — Thursday',
        nextAction: 'Draft this week\'s The Oak issue in Beehiiv',
      },
    },
  },
  {
    id: "masteryourcareerpath",
    name: "Master Your Career Path",
    url: "masteryourcareerpath.com",
    description: "Career development, coaching and PRIME/OPERATE frameworks",
    github: "https://github.com/Damaka72/Masteryourcareerpath",
    admin: "https://masteryourcareerpath.com/admin",
    initials: "MY",
    driveFolders: [
      { label: "Drive: MYCP Root", url: "https://drive.google.com/drive/folders/1-MQvh4R896EVtO5NucFDvtctppSOaiqd" },
      { label: "Drive: PRIME", url: "https://drive.google.com/drive/folders/1D-LF8VMQIBO5Ri53aks5_C8lpyOCYoUH" },
      { label: "Drive: OPERATE", url: "https://drive.google.com/drive/folders/1VWuK0HAlpg4YvaUugjNPTux6BkhQeP0s" },
    ],
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram',
        schedule: 'Daily, Monday to Saturday',
        nextAction: 'Approve this week\'s posts in the Sunday review; Cowork schedules them',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'The Pathway — Tuesday',
        nextAction: 'Draft this week\'s The Pathway issue in Beehiiv',
      },
    },
  },
  {
    id: "aiviralvideoprompts",
    name: "AI Viral Video Prompts",
    url: "aiviralvideoprompts.com",
    description: "AI-powered prompts for creating viral video content",
    github: "https://github.com/Damaka72/ai-viral-video-prompts",
    admin: "https://aiviralvideoprompts.com/admin",
    initials: "AI",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + TikTok + Pinterest + YouTube',
        schedule: 'Daily, Monday to Saturday',
        nextAction: 'Approve this week\'s posts in the Sunday review; Cowork schedules them',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Set up — content needed',
        cadence: 'The Prompt-ly — Wednesday',
        nextAction: 'Draft this week\'s The Prompt-ly issue in Beehiiv',
      },
    },
  },
  {
    id: "world-of-contracts",
    name: "World of Contracts",
    url: "www.worldofcontracts.co.uk",
    description: "UK jobs board for commercial, contracts and procurement roles",
    github: "https://github.com/Damaka72/roles-board",
    initials: "WC",
    // Not part of the content pipeline: its work is tracked in data/trackers/world-of-contracts.json.
  },
  {
    id: "the-naija-food-guide",
    name: "The Naija Food Guide",
    url: "thenaijafoodguide.co.uk",
    description: "UK directory of verified Nigerian restaurants and licensed caterers",
    github: "https://github.com/Damaka72/thenaijafoodguide",
    admin: "https://thenaijafoodguide.co.uk/admin",
    initials: "NF",
    // Not part of the content pipeline yet: its work is tracked in data/trackers/the-naija-food-guide.json.
  },
  {
    id: "didianolue",
    name: "Didi Anolue",
    url: "didianolue.co.uk",
    description: "Personal consultancy site — procurement & commercial leadership",
    github: "https://github.com/Damaka72/didi-anolue-landing-page",
    admin: "https://didianolue.co.uk/admin",
    initials: "DA",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + Twitter/X + YouTube',
        schedule: '3x/week',
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'not_started' as const,
        statusLabel: 'None — handled personally',
        cadence: 'None — handled personally',
        nextAction: 'No newsletter — handled personally',
      },
    },
  },
];
