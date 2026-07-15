// ── Blotato account map — SINGLE SOURCE OF TRUTH ─────────────────────────────
// Verified against blotato_list_accounts. Two maps, two purposes:
//
//   ACCOUNT_MAP           — publish targets: siteId → platform → { accountId,
//                           platform, target }. Used to CREATE posts
//                           (app/api/review/push — the only publisher).
//   BLOTATO_SITE_ACCOUNTS — the site-specific (1:1) account IDs used to COUNT
//                           scheduled posts per site from the Blotato schedules
//                           listing (app/api/status/route.ts). Facebook (31336)
//                           and LinkedIn (21073) share one parent account across
//                           every site, so they are excluded here — only the
//                           per-site accounts (Instagram/TikTok/Pinterest/YouTube/
//                           Twitter) attribute cleanly to a single site.

export interface AccountTarget {
  accountId: string;
  platform:  string;          // value for content.platform + target.targetType
  target:    Record<string, unknown>; // platform-specific fields inside target{}
}

export const ACCOUNT_MAP: Record<string, Record<string, AccountTarget | null>> = {
  didianolue: {
    'LinkedIn':    {
      accountId: '21073',
      platform:  'linkedin',
      target:    {}, // personal profile (Didi Anolue) — no pageId needed
    },
    'X (Twitter)': {
      accountId: '18212',
      platform:  'twitter',
      target:    {}, // @DidiAnolue
    },
    'Instagram':   null, // needs media — add manually in Blotato
  },

  masteryourcareerpath: {
    'LinkedIn':    {
      accountId: '21073',
      platform:  'linkedin',
      target:    { pageId: '105476735' }, // Master Your Career Path company page
    },
    'Instagram':   null, // needs media
    'TikTok':      null, // TikTok requires video — add in Blotato manually
  },

  oldoaktown: {
    'Facebook':    {
      accountId: '31336',
      platform:  'facebook',
      target:    { pageId: '897799196752213' }, // Old Oak Town Facebook page
    },
    'Instagram':   null, // needs media
    'X (Twitter)': null, // not connected
  },

  theconcurrentcontractor: {
    'LinkedIn':    {
      accountId: '21073',
      platform:  'linkedin',
      target:    { pageId: '108040401' }, // The Concurrent Contractor company page
    },
    'Instagram':   null, // needs media
    'X (Twitter)': null, // not connected
  },

  aiviralvideoprompts: {
    'LinkedIn':    {
      accountId: '21073',
      platform:  'linkedin',
      target:    { pageId: '109540269' }, // AI Viral Video Prompts company page (confirmed; duplicate 109539232 disconnected)
    },
    'TikTok':      null, // TikTok requires video — add in Blotato manually
    'Instagram':   null, // needs media
    'X (Twitter)': null, // not connected
  },
};

export const BLOTATO_SITE_ACCOUNTS: Record<string, string[]> = {
  oldoaktown:              ['46484'],                            // 46484 = Instagram @oldoaktown
  theconcurrentcontractor: ['46494', '36388'],                  // 46494 = Instagram @theconcurrentcontractor · 36388 = YouTube (TCC)
  masteryourcareerpath:    ['46492', '36387'],                  // 46492 = Instagram @masteryourcareerpath · 36387 = YouTube (MYCP)
  aiviralvideoprompts:     ['46493', '41948', '6423', '36389'], // 46493 = Instagram @aiviralvideoprompts · 41948 = AIVVP (legacy — not in current account list) · 6423 = Pinterest (AIVVP) · 36389 = YouTube (AIVVP)
  didianolue:              ['46490', '18212', '36391'],         // 46490 = Instagram @damaka (Didi) · 18212 = X/Twitter @DidiAnolue · 36391 = YouTube (Didi Anolue)
};
