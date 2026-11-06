// ── Overnight: emails and industry news (PLACEHOLDER) ────────────────────────
//   GET /api/hub/overnight → { emails, news }
// Not wired up yet, on purpose: the brief starts both as placeholders. The
// response shape below is what the Overnight section already renders, so wiring
// up is replacing the two `connected: false` objects with real lookups (Gmail
// for emails; a news source for the topics in `watching`) and nothing else.
// Auth is enforced app-wide by the root proxy.ts — no per-route check here.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface OvernightEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  /** Site or project id it relates to, if known. */
  about?: string;
  href?: string;
}

export interface OvernightNews {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  topic: string;
  href: string;
}

export interface OvernightFeed<T> {
  connected: boolean;
  items: T[];
}

export interface OvernightResponse {
  emails: OvernightFeed<OvernightEmail>;
  news: OvernightFeed<OvernightNews>;
  /** Topics the news feed will cover, shown while it is not connected. */
  watching: string[];
}

export async function GET() {
  return NextResponse.json(
    {
      emails: { connected: false, items: [] },
      news: { connected: false, items: [] },
      watching: [
        'Procurement and commercial leadership',
        'IR35 and contracting',
        'Career development',
        'Old Oak Common regeneration',
        'AI video',
      ],
    } satisfies OvernightResponse,
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
