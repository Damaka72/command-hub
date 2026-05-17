// ── Blotato Scheduler ─────────────────────────────────────────────────────────
// Schedules approved drafts in Blotato 48h from now so they sit in the
// queue for review and media attachment before publishing.

import { GraderResult } from './types.js';
import { log, logOk, logWarn } from './utils.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const BLOTATO_KEY  = process.env.BLOTATO_API_KEY;
const BLOTATO_BASE = 'https://backend.blotato.com/v2';

// ── Account map: siteId → platform → Blotato credentials ─────────────────────

interface AccountConfig {
  accountId: string;
  platform:  string;
  pageId?:   string;
}

const ACCOUNT_MAP: Record<string, Record<string, AccountConfig>> = {
  masteryourcareerpath: {
    linkedin:  { accountId: '21073', platform: 'linkedin', pageId: '105476735' },
    instagram: { accountId: '46492', platform: 'instagram' },
    tiktok:    { accountId: '42443', platform: 'tiktok' },
    facebook:  { accountId: '31336', platform: 'facebook', pageId: '505366222652604' },
  },
  theconcurrentcontractor: {
    linkedin:  { accountId: '21073', platform: 'linkedin', pageId: '108040401' },
    instagram: { accountId: '46494', platform: 'instagram' },
    facebook:  { accountId: '31336', platform: 'facebook', pageId: '715241081677485' },
  },
  oldoaktown: {
    linkedin:  { accountId: '21073', platform: 'linkedin', pageId: '110106506' },
    instagram: { accountId: '46484', platform: 'instagram' },
    facebook:  { accountId: '31336', platform: 'facebook', pageId: '897799196752213' },
  },
  aiviralvideoprompts: {
    linkedin:  { accountId: '21073', platform: 'linkedin', pageId: '109540269' },
    instagram: { accountId: '46493', platform: 'instagram' },
    tiktok:    { accountId: '42441', platform: 'tiktok' },
    facebook:  { accountId: '31336', platform: 'facebook', pageId: '889709114216937' },
  },
};

function normalisePlatform(platform: string): string {
  return platform.toLowerCase()
    .replace(/x \(twitter\)/, 'twitter')
    .replace(/[^a-z]/g, '');
}

// 48h from now — gives the user a window to review, add media, and edit
function scheduledAt(): string {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}

async function scheduleOne(
  siteId:   string,
  platform: string,
  text:     string,
): Promise<void> {
  const key    = normalisePlatform(platform);
  const config = ACCOUNT_MAP[siteId]?.[key];

  if (!config) {
    logWarn(`Blotato: no account mapped for ${siteId}/${key} — skipping`);
    return;
  }

  // TikTok requires a video — can't schedule text-only. Text is in the dashboard review queue.
  if (key === 'tiktok') {
    logWarn(`Blotato: ${siteId}/tiktok — skipped (TikTok requires video; use the review queue text when recording)`);
    return;
  }

  const target: Record<string, unknown> = {
    targetType: config.platform,
  };
  if (config.pageId) target.pageId = config.pageId;

  const content: Record<string, unknown> = {
    platform:  config.platform,
    text,
    mediaUrls: [],
  };

  const res = await fetch(`${BLOTATO_BASE}/posts`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${BLOTATO_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post: { accountId: config.accountId, target, content, scheduledTime: scheduledAt() } }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    logWarn(`Blotato: ${siteId}/${key} — HTTP ${res.status}: ${err}`);
    return;
  }

  logOk(`Blotato: ${siteId}/${key} — scheduled for review in 48h`);
}

export async function scheduleApprovedDrafts(results: GraderResult[]): Promise<void> {
  if (!BLOTATO_KEY) {
    logWarn('Blotato: BLOTATO_API_KEY not set — skipping scheduling');
    return;
  }

  const passing = results.filter(r => r.verdict === 'pass');
  if (passing.length === 0) {
    log('  No passing drafts to schedule in Blotato');
    return;
  }

  log(`  Scheduling ${passing.length} draft${passing.length === 1 ? '' : 's'} in Blotato (48h window)…`);

  for (const r of passing) {
    await scheduleOne(r.siteId, r.draft.platform, r.draft.content);
  }
}
