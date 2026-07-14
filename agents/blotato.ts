// NOT CALLED — approval flow will invoke this in Phase 2. Never call from the pipeline.
//
// ── Blotato Push ─────────────────────────────────────────────────────────────
// Takes approved drafts from the pipeline and pushes them to Blotato for
// scheduling via the v2 REST API.
//
// Text-capable platforms (LinkedIn, Twitter/X, Facebook) are queued to the
// next free slot automatically.
// TikTok posts are pushed as SELF_ONLY drafts so Didi can review before
// publishing (TikTok requires video — the text becomes the caption/title).
// Instagram is skipped — it requires media that must be added manually.
//
// API docs: https://help.blotato.com/api/publish-post.md

import { GraderResult } from './types.js';
import { logOk, logWarn, logError } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BLOTATO_API_KEY = process.env.BLOTATO_API_KEY;
const BLOTATO_URL     = 'https://backend.blotato.com/v2/posts';

// ── Account map ───────────────────────────────────────────────────────────────
// Verified from blotato_list_accounts. Each entry maps to the correct
// accountId and the platform-specific fields that go inside `target`.

interface AccountTarget {
  accountId: string;
  platform:  string;          // value for content.platform + target.targetType
  target:    Record<string, unknown>; // platform-specific fields inside target{}
}

const ACCOUNT_MAP: Record<string, Record<string, AccountTarget | null>> = {
  didianolue: {
    'LinkedIn':    {
      accountId: '21073',
      platform:  'linkedin',
      target:    {}, // personal profile — no pageId needed
    },
    'X (Twitter)': {
      accountId: '18212',
      platform:  'twitter',
      target:    {},
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
    'TikTok':      null, // TikTok requires video — add in Blotato manually
    'Instagram':   null, // needs media
    'X (Twitter)': null, // not connected
  },
};

// ── Scheduling ────────────────────────────────────────────────────────────────
// Each post is scheduled for its named weekday at 09:00 UTC in the coming week.
// The pipeline runs on Sunday/Monday; posts land Mon–Fri of that same week.
// If a post's day has already passed this week, it falls to the following week.

const DAY_INDEX: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
};

function getScheduledTime(dayName: string): string {
  const targetDay = DAY_INDEX[dayName] ?? 1;
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 1=Mon … 6=Sat

  // Days until target weekday (always look forward, never same day)
  let daysAhead = targetDay - currentDay;
  if (daysAhead <= 0) daysAhead += 7; // already passed → next week

  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  d.setUTCHours(11, 0, 0, 0); // 11am UTC = noon UK summer (BST) / 11am UK winter (GMT)
  return d.toISOString();
}

// ── REST helper ───────────────────────────────────────────────────────────────

interface BlotatoResponse {
  postSubmissionId?: string;
  error?: string;
}

async function callBlotatoApi(
  accountId: string,
  platform:  string,
  text:      string,
  target:    Record<string, unknown>,
  dayName:   string,
): Promise<BlotatoResponse> {
  if (!BLOTATO_API_KEY) {
    throw new Error('BLOTATO_API_KEY is not set in .env.local');
  }

  const body = {
    post: {
      accountId,
      content: {
        text,
        mediaUrls: [],
        platform,
      },
      target: {
        targetType: platform,
        ...target,
      },
    },
    scheduledTime: getScheduledTime(dayName), // root-level, correct weekday at 9am UTC
  };

  const res = await fetch(BLOTATO_URL, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'blotato-api-key': BLOTATO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    const msg = (json?.message as string) || (json?.error as string) || res.statusText;
    return { error: msg };
  }

  return { postSubmissionId: json?.postSubmissionId as string | undefined };
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface BlotatoPushResult {
  siteId:            string;
  platform:          string;
  status:            'queued' | 'skipped' | 'failed';
  reason?:           string;
  postSubmissionId?: string;
}

export async function pushApprovedToBlotato(
  approved: GraderResult[],
): Promise<BlotatoPushResult[]> {
  if (!BLOTATO_API_KEY) {
    logWarn('BLOTATO_API_KEY not set — skipping Blotato push. Add it to .env.local to enable auto-scheduling.');
    return approved.map(r => ({
      siteId:   r.siteId,
      platform: r.draft.platform,
      status:   'skipped' as const,
      reason:   'BLOTATO_API_KEY not configured',
    }));
  }

  const results: BlotatoPushResult[] = [];

  for (const result of approved) {
    const { siteId, draft } = result;
    const siteAccounts = ACCOUNT_MAP[siteId];

    if (!siteAccounts) {
      logWarn(`${siteId} — no Blotato account map entry, skipping`);
      results.push({ siteId, platform: draft.platform, status: 'skipped', reason: 'No account map entry' });
      continue;
    }

    const acctEntry = siteAccounts[draft.platform];

    if (acctEntry === null) {
      logWarn(`${siteId} (${draft.platform}) — skipped (requires media — add image/video in Blotato manually)`);
      results.push({ siteId, platform: draft.platform, status: 'skipped', reason: 'Platform requires media' });
      continue;
    }

    if (acctEntry === undefined) {
      logWarn(`${siteId} (${draft.platform}) — no account configured for this platform`);
      results.push({ siteId, platform: draft.platform, status: 'skipped', reason: 'Platform not in account map' });
      continue;
    }

    try {
      const { postSubmissionId, error } = await callBlotatoApi(
        acctEntry.accountId,
        acctEntry.platform,
        draft.content,
        acctEntry.target,
        draft.dayName,
      );

      if (error) {
        logError(`${siteId} (${draft.platform}) — Blotato error: ${error}`);
        results.push({ siteId, platform: draft.platform, status: 'failed', reason: error });
      } else {
        logOk(`${siteId} (${draft.dayName}, ${draft.platform}) — queued in Blotato (id: ${postSubmissionId ?? 'pending'})`);
        results.push({ siteId, platform: draft.platform, status: 'queued', postSubmissionId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError(`${siteId} (${draft.platform}) — ${msg}`);
      results.push({ siteId, platform: draft.platform, status: 'failed', reason: msg });
    }
  }

  return results;
}
