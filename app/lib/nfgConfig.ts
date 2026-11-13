// The Naija Food Guide: settings for its Hub page. Plain data, edited by hand.

export const NFG_QUICK_LINKS = [
  { label: 'Monetisation admin', href: 'https://thenaijafoodguide.co.uk/admin/monetisation' },
  { label: 'Photo review', href: 'https://thenaijafoodguide.co.uk/admin/photos' },
  // Test-mode dashboard while the build is in test mode. Change to https://dashboard.stripe.com at go-live (checklist G3).
  { label: 'Stripe dashboard (test mode)', href: 'https://dashboard.stripe.com/test/dashboard' },
] as const;

export const NFG_GROWTH_PLAN = {
  summary: 'No advertising spend. Growth comes from short faceless videos, food influencers gifted a meal, and direct outreach to the candidate businesses (caterers first). The brand stays faceless.',
  platforms: ['TikTok', 'Instagram', 'Facebook'],
  // CONFIRM with Didi: default of 3 posts a week on each active platform.
  weeklyPostsPerPlatform: 3,
  influencerChecklist: [
    'Pick food creators whose audience is UK-based and cares about Nigerian food.',
    'Agree the wording before the meal: any free meal must be shown as "gifted" or "#ad".',
    'Give them the platform link with its tracking tag (for example utm_source=tiktok) so visits can be counted.',
    'Only use photos and video you have the right to post, and credit the creator.',
    'Record the contact and the outcome so the same person is not asked twice.',
  ],
} as const;
