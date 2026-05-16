import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Damaka72/command-hub';
const FILE_PATH = 'public/data/tasks.json';

export async function POST(request: NextRequest) {
  const body = await request.json() as { siteId: string; tasks: unknown[] };
  const { siteId, tasks } = body;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ ok: false, fallback: true });
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

    const fileData = await getRes.json() as { sha: string; content: string };
    const sha = fileData.sha;
    const current = JSON.parse(
      Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf8')
    ) as Record<string, unknown[]>;

    current[siteId] = tasks;

    const putRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `chore: update tasks for ${siteId}`,
          content: Buffer.from(JSON.stringify(current, null, 2)).toString('base64'),
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
