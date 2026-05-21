import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Damaka72/command-hub';
const FILE_PATH = 'data/coordinator-status.json';

export interface SiteCoordinatorStatus {
  lastBriefed: string;
  weekTheme: string;
  postsApproved: number;
  postsPending: number;
  newsletterStatus: string;
  nextSend: string;
}

export interface CoordinatorStatusData {
  lastUpdated: string;
  sites: {
    aivvp: SiteCoordinatorStatus;
    mycp: SiteCoordinatorStatus;
    tcc: SiteCoordinatorStatus;
    oot: SiteCoordinatorStatus;
  };
}

function readLocalStatus(): CoordinatorStatusData | null {
  try {
    const full = path.join(process.cwd(), FILE_PATH);
    if (!fs.existsSync(full)) return null;
    return JSON.parse(fs.readFileSync(full, 'utf-8')) as CoordinatorStatusData;
  } catch {
    return null;
  }
}

export async function GET() {
  const data = readLocalStatus();
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as CoordinatorStatusData;

  if (!GITHUB_TOKEN) {
    // Dev fallback: write directly to disk
    try {
      const full = path.join(process.cwd(), FILE_PATH);
      fs.writeFileSync(full, JSON.stringify(body, null, 2), 'utf-8');
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false, error: 'No GitHub token and disk write failed' }, { status: 500 });
    }
  }

  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!getRes.ok) return NextResponse.json({ ok: false, fallback: true });

    const fileData = await getRes.json() as { sha: string };
    const sha = fileData.sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'chore: update coordinator status',
          content: Buffer.from(JSON.stringify(body, null, 2)).toString('base64'),
          sha,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!putRes.ok) return NextResponse.json({ ok: false, fallback: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, fallback: true });
  }
}
