// ── Site metadata — SINGLE SOURCE OF TRUTH ──────────────────────────────────
// Extracted from app/page.tsx so both the dashboard and /social (and anything
// else that needs name/url/brand colour per site) share one list instead of
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
    socialAgent: "https://oldoaktown.co.uk/social-agent",
    brandColor: "#4C8A35",
    initials: "OO",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram',
        schedule: '1 post/day',
        nextAction: 'Continue weekly scheduling in Blotato',
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
    id: "theconcurrentcontractor",
    name: "The Concurrent Contractor",
    url: "theconcurrentcontractor.com",
    description: "IR35, contracting resources and community",
    github: "https://github.com/Damaka72/Theconcurrentcontractor",
    admin: "https://www.theconcurrentcontractor.com/admin",
    socialAgent: "https://www.theconcurrentcontractor.com/social-agent",
    brandColor: "#FFD700",
    initials: "TC",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + YouTube',
        schedule: '1 post/day',
        nextAction: 'Continue weekly scheduling in Blotato',
      },
      beehiiv: {
        status: 'in_progress' as const,
        statusLabel: 'Published within The Pathway',
        cadence: 'The Consultant — published within The Pathway (MYCP Beehiiv)',
        nextAction: 'Contribute The Consultant section to The Pathway (MYCP Beehiiv)',
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
    socialAgent: "https://masteryourcareerpath.com/social-agent",
    brandColor: "#F5A623",
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
        schedule: '1 post/day',
        nextAction: 'Continue weekly scheduling in Blotato',
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
    socialAgent: "https://aiviralvideoprompts.com/social-agent",
    brandColor: "#4ECDC4",
    initials: "AI",
    marketingPlan: {
      blotato: {
        status: 'active' as const,
        statusLabel: 'Active',
        platform: 'Instagram + TikTok + Pinterest + YouTube',
        schedule: '1 post/day',
        nextAction: 'Continue weekly scheduling in Blotato',
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
    id: "didianolue",
    name: "Didi Anolue",
    url: "didianolue.co.uk",
    description: "Personal consultancy site — procurement & commercial leadership",
    github: "https://github.com/Damaka72/didi-anolue-landing-page",
    admin: "https://didianolue.co.uk/admin",
    socialAgent: "https://didianolue.co.uk/social-agent",
    brandColor: "#4A7FC1",
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
