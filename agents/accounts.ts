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

// Publish targets for the four pipeline sites only. didianolue is NOT a pipeline
// site and is never produced/approved/pushed here, so it is intentionally absent
// from the publish path. (It remains in BLOTATO_SITE_ACCOUNTS below purely for the
// status route's scheduled-post monitoring.)
//
// Every platform each site produces (see blotatoPlatforms in site-configs.ts) has
// a target here. `target` holds the platform-specific fields Blotato's v2 posts API
// expects nested under `target` (pageId for Facebook/LinkedIn company pages; the
// TikTok privacy/disclosure flags). Instagram needs no static fields — the push
// route sets mediaType (reel) dynamically when the attached media is a video.
//
// Instagram, TikTok, Pinterest and YouTube CANNOT publish without media: the push
// route holds those back (status stays approved_needs_media) until a media URL is
// attached in the review queue. LinkedIn/Facebook publish with or without media.
//
// A `null` value means the platform is intentionally not a publish target (e.g. the
// site has no connected account for it); the push route skips those rows.
//
// TikTok defaults below are conservative — public, comments on, marked AI-generated
// and your-brand. Change them here (single source of truth) if the owner wants
// different behaviour.
const TIKTOK_DEFAULTS = {
  privacyLevel:     'PUBLIC_TO_EVERYONE',
  disabledComments: false,
  disabledDuet:     false,
  disabledStitch:   false,
  isBrandedContent: false,
  isYourBrand:      true,
  isAiGenerated:    true,
};

export const ACCOUNT_MAP: Record<string, Record<string, AccountTarget | null>> = {
  masteryourcareerpath: {
    'LinkedIn':    { accountId: '21073', platform: 'linkedin',  target: { pageId: '105476735' } },      // MYCP company page
    'Instagram':   { accountId: '46492', platform: 'instagram', target: {} },                            // @masteryourcareerpath (needs media)
    'TikTok':      { accountId: '42443', platform: 'tiktok',    target: { ...TIKTOK_DEFAULTS } },        // @masteryourcareerpath (needs video)
    'Facebook':    { accountId: '31336', platform: 'facebook',  target: { pageId: '505366222652604' } }, // MYCP Facebook page
  },

  oldoaktown: {
    'LinkedIn':    { accountId: '21073', platform: 'linkedin',  target: { pageId: '110106506' } },       // Old Oak Town company page
    'Instagram':   { accountId: '46484', platform: 'instagram', target: {} },                            // @oldoaktown (needs media)
    'Facebook':    { accountId: '31336', platform: 'facebook',  target: { pageId: '897799196752213' } }, // Old Oak Town Facebook page
    'X (Twitter)': null, // not connected
  },

  theconcurrentcontractor: {
    'LinkedIn':    { accountId: '21073', platform: 'linkedin',  target: { pageId: '108040401' } },       // TCC company page
    'Instagram':   { accountId: '46494', platform: 'instagram', target: {} },                            // @theconcurrentcontractor (needs media)
    'Facebook':    { accountId: '31336', platform: 'facebook',  target: { pageId: '715241081677485' } }, // TCC Facebook page
    'X (Twitter)': null, // not connected
  },

  aiviralvideoprompts: {
    'LinkedIn':    { accountId: '21073', platform: 'linkedin',  target: { pageId: '109540269' } },       // AIVVP company page (dup 109539232 disconnected)
    'Instagram':   { accountId: '46493', platform: 'instagram', target: {} },                            // @aiviralvideoprompts (needs media)
    'TikTok':      { accountId: '42441', platform: 'tiktok',    target: { ...TIKTOK_DEFAULTS } },        // @aiviralvideoprompts (needs video)
    'Facebook':    { accountId: '31336', platform: 'facebook',  target: { pageId: '889709114216937' } }, // AIVVP Facebook page
    'X (Twitter)': null, // not connected
  },
};

// Platforms that cannot publish without media attached (lowercase acct.platform).
// The push route holds these back until a media URL is present on the row.
export const MEDIA_REQUIRED_PLATFORMS = new Set(['instagram', 'tiktok', 'pinterest', 'youtube']);

// Video file extensions — used to decide Instagram mediaType (reel vs feed image).
const VIDEO_EXT = /\.(mp4|mov|webm|m4v|avi|mkv)(\?.*)?$/i;
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url.trim());
}

export const BLOTATO_SITE_ACCOUNTS: Record<string, string[]> = {
  oldoaktown:              ['46484'],                                    // 46484 = Instagram @oldoaktown
  theconcurrentcontractor: ['46494', '36388'],                          // 46494 = Instagram @theconcurrentcontractor · 36388 = YouTube (TCC)
  masteryourcareerpath:    ['46492', '42443', '36387'],                 // 46492 = Instagram @masteryourcareerpath · 42443 = TikTok @masteryourcareerpath · 36387 = YouTube (MYCP)
  aiviralvideoprompts:     ['46493', '42441', '41948', '6423', '36389'],// 46493 = Instagram @aiviralvideoprompts · 42441 = TikTok @aiviralvideoprompts · 41948 = AIVVP (legacy — not in current account list) · 6423 = Pinterest (AIVVP) · 36389 = YouTube (AIVVP)
  didianolue:              ['46490', '18212', '36391'],                 // 46490 = Instagram @damaka (Didi) · 18212 = X/Twitter @DidiAnolue · 36391 = YouTube (Didi Anolue)
};
