'use server';

// Saves one checklist item. A server action (not an API route), so it adds no Vercel function.
// The whole Hub sits behind proxy.ts, which also covers server actions.

import { isChecklistStatus, looksLikeSecret } from '@/app/lib/checklistLogic';
import { loadChecklistFile, saveChecklistItem } from '@/app/lib/checklistStore';

export type SaveResult =
  | { ok: true; saved: boolean; updated_at: string }
  | { ok: false; error: string };

export async function updateChecklistItem(
  siteId: string,
  itemId: string,
  input: { status: string; blocked_reason?: string; notes?: string; secrets_set?: string[] },
): Promise<SaveResult> {
  const file = loadChecklistFile(siteId);
  const item = file?.items.find(i => i.id === itemId);
  if (!file || !item) return { ok: false, error: 'Unknown checklist item.' };
  if (!isChecklistStatus(input.status)) return { ok: false, error: 'Unknown status.' };

  const reason = (input.blocked_reason ?? '').trim().slice(0, 300);
  const notes = (input.notes ?? '').trim().slice(0, 1000);
  if (input.status === 'blocked' && reason.length < 3) return { ok: false, error: 'Please say why this is blocked.' };
  // No secrets, ever: refuse text that looks like a key, token or password.
  if (looksLikeSecret(reason) || looksLikeSecret(notes))
    return { ok: false, error: 'That looks like a key or password. Never paste secrets here. Write only whether it is set.' };

  const allowed = new Set(item.secret_names ?? []);
  const secrets = (input.secrets_set ?? []).filter(n => allowed.has(n));

  const saved = await saveChecklistItem(siteId, itemId, {
    status: input.status,
    blocked_reason: input.status === 'blocked' ? reason : null,
    notes: notes || null,
    secrets_set: secrets,
  });
  return { ok: true, saved, updated_at: new Date().toISOString() };
}
