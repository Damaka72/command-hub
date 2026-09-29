import { NextResponse } from 'next/server';

const BLOTATO_BASE = 'https://backend.blotato.com/v2';
const BLOTATO_KEY  = process.env.BLOTATO_API_KEY;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlotatoPost {
  id: string;
  platform: string;
  text: string;
  mediaUrls: string[];
  postTime: string;
  state: {
    type: 'published' | 'scheduled' | 'failed';
    postUrl?: string;
    errorMessage?: string;
  };
  site: string;
}

export interface BlotatoSiteFeed {
  published: BlotatoPost[];
  scheduled: BlotatoPost[];
}

export interface BlotatoData {
  bySite: Record<string, BlotatoSiteFeed>;
  totalPublished: number;
  totalScheduled: number;
}

// ─── Site detection ───────────────────────────────────────────────────────────

// Maps known Blotato subaccount names and usernames → site IDs
const SUBACCOUNT_MAP: Record<string, string> = {
  'Old Oak Town':              'oldoaktown',
  'The Concurrent Contractor': 'theconcurrentcontractor',
  'AI Viral Video Prompts':    'aiviralvideoprompts',
  'Master Your Career Path':   'masteryourcareerpath',
};

const USERNAME_MAP: Record<string, string> = {
  oldoaktown:              'oldoaktown',
  aiviralvideoprompts:     'aiviralvideoprompts',
  masteryourcareerpath:    'masteryourcareerpath',
  theconcurrentcontractor: 'theconcurrentcontractor',
};

function detectSiteFromAccount(account: Record<string, unknown> | null): string | null {
  if (!account) return null;
  const subName = account.subaccountName as string | null;
  const username = account.username as string | null;
  if (subName && SUBACCOUNT_MAP[subName]) return SUBACCOUNT_MAP[subName];
  if (username && USERNAME_MAP[username]) return USERNAME_MAP[username];
  return null;
}

// Fallback: infer site from platform + text content
function detectSiteFromContent(platform: string, text: string): string {
  // Platform-exclusive mappings (each platform is only used by one site)
  if (platform === 'facebook') return 'oldoaktown';
  if (platform === 'tiktok')   return 'aiviralvideoprompts';
  if (platform === 'linkedin') return 'theconcurrentcontractor';

  // Content-based detection for Twitter/Instagram (shared across sites)
  const t = text.toLowerCase();
  if (
    t.includes('aiviralvideoprompts') || t.includes('viral video prompt') ||
    t.includes('prompt library') || t.includes('ai video') || t.includes('stop the scroll')
  ) return 'aiviralvideoprompts';

  if (
    t.includes('old oak') || t.includes('park royal') || t.includes('oldoaktown') ||
    t.includes('opdc') || t.includes('hemiko') || t.includes('station box') ||
    t.includes('hs2') || t.includes('old oak common')
  ) return 'oldoaktown';

  if (
    t.includes('ir35') || t.includes('theconcurrentcontractor') || t.includes('ltd co') ||
    t.includes('outside ir35') || t.includes('consultant who contracts')
  ) return 'theconcurrentcontractor';

  if (
    t.includes('masteryourcareerpath') || t.includes('skool') || t.includes('cv-to-website') ||
    t.includes('career path') || t.includes('operate') || t.includes('prime framework')
  ) return 'masteryourcareerpath';

  if (
    t.includes('didianolue') || t.includes('procurement') ||
    t.includes('commercial contracts') || t.includes('supplier risk')
  ) return 'didianolue';

  return 'unknown';
}

// ─── Blotato API helpers ──────────────────────────────────────────────────────

async function blotatoFetch(path: string, params: Record<string, string> = {}) {
  if (!BLOTATO_KEY) return null;
  const url = new URL(`${BLOTATO_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString(), {
      headers: { 'blotato-api-key': BLOTATO_KEY },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [postsData, schedulesData] = await Promise.all([
    blotatoFetch('/posts', { since, limit: '100' }),
    blotatoFetch('/schedules', { limit: '50' }),
  ]);

  // Map published posts
  const published: BlotatoPost[] = ((postsData?.items ?? []) as Record<string, unknown>[])
    .filter(p => (p.state as Record<string, unknown>)?.type === 'published')
    .map(p => ({
      id:        p.id        as string,
      platform:  p.platform  as string,
      text:      (p.text     as string) ?? '',
      mediaUrls: (p.mediaUrls as string[]) ?? [],
      postTime:  p.postTime  as string,
      state:     p.state     as BlotatoPost['state'],
      site:      detectSiteFromContent(p.platform as string, (p.text as string) ?? ''),
    }));

  // Map scheduled posts (richer account data available)
  const scheduled: BlotatoPost[] = ((schedulesData?.items ?? []) as Record<string, unknown>[])
    .map(s => {
      const draft   = s.draft   as Record<string, unknown> | null;
      const content = draft?.content as Record<string, unknown> | null;
      const account = s.account as Record<string, unknown> | null;
      const platform = (content?.platform as string) ?? '';
      const text     = (content?.text     as string) ?? '';
      const site =
        detectSiteFromAccount(account) ??
        detectSiteFromContent(platform, text);
      return {
        id:        s.id       as string,
        platform,
        text,
        mediaUrls: (content?.mediaUrls as string[]) ?? [],
        postTime:  s.scheduledAt as string,
        state:     { type: 'scheduled' as const },
        site,
      };
    });

  // Group by site
  const SITE_IDS = ['oldoaktown', 'theconcurrentcontractor', 'masteryourcareerpath', 'aiviralvideoprompts', 'didianolue'];
  const bySite: Record<string, BlotatoSiteFeed> = {};
  for (const id of SITE_IDS) {
    bySite[id] = {
      published: published.filter(p => p.site === id),
      scheduled: scheduled.filter(p => p.site === id),
    };
  }

  const result: BlotatoData = {
    bySite,
    totalPublished: published.length,
    totalScheduled: scheduled.length,
  };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  });
}
