// ── Shared Blotato push call ──────────────────────────────────────────────────
// The actual Blotato v2 REST call, shared by /api/review/push (the weekly batch
// push, gated behind human review) and the Old Oak Town business-spotlight
// auto-publish path (app/lib/oldoaktown-promote.ts, gated behind
// OLDOAKTOWN_AUTO_PUBLISH_SPOTLIGHTS). Keep this the single place that talks to
// Blotato so both paths stay in sync.

const BLOTATO_URL = 'https://backend.blotato.com/v2/posts';

export async function callBlotato(
  apiKey: string,
  accountId: string,
  platform: string,
  text: string,
  target: Record<string, unknown>,
  mediaUrls: string[],
  scheduledTime: string,
): Promise<{ postSubmissionId?: string; error?: string }> {
  const body = {
    post: {
      accountId,
      content: { text, mediaUrls, platform },
      target,
    },
    scheduledTime,
  };
  const res = await fetch(BLOTATO_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': apiKey },
    body:    JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return { error: (json?.message as string) || (json?.error as string) || res.statusText };
  }
  return { postSubmissionId: json?.postSubmissionId as string | undefined };
}
