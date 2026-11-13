// ── The Naija Food Guide: metrics feed ──────────────────────────────────────
// Counts and money only, no personal data. Read from a Supabase Edge Function in the directory's
// project (supabase/functions/hub-metrics), protected by a shared secret. Both values below live in
// this project's Vercel environment variables, never in the repo.
//   NFG_METRICS_URL     address of the hub-metrics function
//   NFG_METRICS_SECRET  the shared secret the function expects (sent as a Bearer token)

export interface NfgMetrics {
  generated_at: string;
  listings_by_tier: { line: number; silver: number; gold: number };
  silver_expiring_14d: number;
  subscriptions: { silver_active: number; gold_active: number; past_due: number; cancelled_this_month: number; free_introductory_silver: number };
  mrr_pence: number;
  claims_pending: number;
  enquiries_30d: number;
  photo_submissions_pending: number;
  outreach: Record<string, number>;
  visits_by_source_30d: Record<string, number>;
  stripe_events_received?: number;
}

export type MetricsResult =
  | { state: 'ok'; metrics: NfgMetrics }
  | { state: 'not_connected' }
  | { state: 'error' };

export async function loadNfgMetrics(): Promise<MetricsResult> {
  const url = process.env.NFG_METRICS_URL;
  const secret = process.env.NFG_METRICS_SECRET;
  if (!url || !secret) return { state: 'not_connected' };
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { state: 'error' };
    const body = (await res.json()) as { ok?: boolean; metrics?: NfgMetrics };
    return body.ok && body.metrics ? { state: 'ok', metrics: body.metrics } : { state: 'error' };
  } catch {
    return { state: 'error' };
  }
}
