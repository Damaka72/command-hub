// ── Social account directory — one place to see every live account ─────────
// Platform, handle, and the actual public profile/page URL (not a link into
// Blotato) for every account connected per site. Sourced from Blotato's
// blotato_list_accounts, cross-checked against agents/accounts.ts (the
// publish-target source of truth). Hand-edit this file as accounts change —
// there's no live sync.

export type SocialAccountStatus = 'linked' | 'needs_link' | 'not_connected';

export interface SocialAccountEntry {
  platform: string;
  handle: string;
  url: string | null; // null when the live public URL isn't confirmed yet
  status: SocialAccountStatus;
  note?: string;
}

export const SITE_SOCIAL_ACCOUNTS: Record<string, SocialAccountEntry[]> = {
  oldoaktown: [
    { platform: 'Facebook',  handle: 'Old Oak Town', url: 'https://www.facebook.com/profile.php?id=897799196752213', status: 'linked' },
    { platform: 'Instagram', handle: '@oldoaktown',   url: 'https://www.instagram.com/oldoaktown/', status: 'linked' },
    { platform: 'LinkedIn',  handle: 'Old Oak Town',  url: 'https://www.linkedin.com/company/110106506/', status: 'linked' },
  ],

  theconcurrentcontractor: [
    { platform: 'Facebook',  handle: 'The Concurrent Contractor', url: 'https://www.facebook.com/profile.php?id=715241081677485', status: 'linked' },
    { platform: 'Instagram', handle: '@theconcurrentcontractor',  url: 'https://www.instagram.com/theconcurrentcontractor/', status: 'linked' },
    { platform: 'LinkedIn',  handle: 'The Concurrent Contractor', url: 'https://www.linkedin.com/company/108040401/', status: 'linked' },
    { platform: 'YouTube',   handle: 'The Concurrent Contractor', url: null, status: 'needs_link', note: "Blotato account id 36388 has no public channel handle on record — paste the real channel URL here." },
  ],

  masteryourcareerpath: [
    { platform: 'Facebook',  handle: 'Master Your Career Path', url: 'https://www.facebook.com/profile.php?id=505366222652604', status: 'linked' },
    { platform: 'Instagram', handle: '@masteryourcareerpath',   url: 'https://www.instagram.com/masteryourcareerpath/', status: 'linked' },
    { platform: 'LinkedIn',  handle: 'Master Your Career Path', url: 'https://www.linkedin.com/company/105476735/', status: 'linked' },
    { platform: 'TikTok',    handle: '@masteryourcareerpath',   url: 'https://www.tiktok.com/@masteryourcareerpath', status: 'linked' },
    { platform: 'YouTube',   handle: 'Master Your Career Path', url: null, status: 'needs_link', note: "Blotato account id 36387 has playlists but no public channel handle on record — paste the real channel URL here." },
  ],

  aiviralvideoprompts: [
    { platform: 'Facebook',  handle: 'AI Viral Video Prompts', url: 'https://www.facebook.com/profile.php?id=889709114216937', status: 'linked' },
    { platform: 'Instagram', handle: '@aiviralvideoprompts',   url: 'https://www.instagram.com/aiviralvideoprompts/', status: 'linked' },
    { platform: 'LinkedIn',  handle: 'AI Viral Video Prompts', url: 'https://www.linkedin.com/company/109540269/', status: 'linked' },
    { platform: 'TikTok',    handle: '@aiviralvideoprompts',   url: 'https://www.tiktok.com/@aiviralvideoprompts', status: 'linked' },
    { platform: 'Pinterest', handle: '@aiviralvideoprompts',   url: 'https://www.pinterest.com/aiviralvideoprompts/', status: 'linked' },
    { platform: 'YouTube',   handle: 'AI Viral Video Prompts', url: null, status: 'needs_link', note: "Blotato account id 36389 has no public channel handle on record — paste the real channel URL here." },
  ],

  didianolue: [
    { platform: 'Instagram', handle: '@damaka',      url: 'https://www.instagram.com/damaka/', status: 'linked' },
    { platform: 'X/Twitter', handle: '@DidiAnolue',  url: 'https://x.com/DidiAnolue', status: 'linked' },
    { platform: 'YouTube',   handle: 'Didi Anolue',  url: null, status: 'needs_link', note: "Blotato account id 36391 has no public channel handle on record — paste the real channel URL here." },
    { platform: 'Facebook',  handle: '—', url: null, status: 'not_connected', note: 'No Facebook account connected in Blotato for this site — confirm whether that\'s intentional.' },
    { platform: 'LinkedIn',  handle: '—', url: null, status: 'not_connected', note: 'No LinkedIn account connected in Blotato for this site — confirm whether that\'s intentional.' },
  ],
};

// LinkedIn company pages connected in Blotato that don't map to any of the
// five sites — surfaced here rather than dropped silently.
export interface UnmappedAccount {
  platform: string;
  handle: string;
  url: string;
}

export const UNMAPPED_ACCOUNTS: UnmappedAccount[] = [
  { platform: 'LinkedIn', handle: 'Home Of Black Owned Beauty Brands', url: 'https://www.linkedin.com/company/100185528/' },
  { platform: 'LinkedIn', handle: 'Smart Contract Management Solutions', url: 'https://www.linkedin.com/company/102861173/' },
];
