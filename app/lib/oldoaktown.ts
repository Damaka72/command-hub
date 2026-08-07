// ── Old Oak Town admin integration ────────────────────────────────────────────
// Old Oak Town (oldoaktown.co.uk) is a separate site/repo (Damaka72/oldoaktown)
// with its own Supabase project and admin dashboard at /admin/dashboard.html.
// This module reads that project directly so Command Hub can surface pending
// business/event approvals and drive the "promote a newly approved business"
// step. It never writes to oldoaktown's data — approve/reject stays a manual
// step in oldoaktown's own admin dashboard.
//
// Businesses: read via Supabase REST with the anon key. oldoaktown's RLS policy
// ("Anyone can read all listings", supabase/migrations/002_admin_dashboard_rls.sql
// in the oldoaktown repo) already opens all-status reads to the anon key — the
// same key its own admin dashboard uses client-side, so this is no more
// privileged than what already ships in oldoaktown's HTML.
//
// Events: oldoaktown has no equivalent open policy for `events`, so these go
// through its `/api/approve-event` endpoint, which requires the same
// ADMIN_PASSWORD as its admin dashboard. Set OLDOAKTOWN_ADMIN_PASSWORD in
// Command Hub's environment to enable this — pending events read as
// unavailable (null), not zero, until it is configured.

const OLDOAKTOWN_SITE_URL = 'https://www.oldoaktown.co.uk';

// Public anon key — the same one already embedded client-side in oldoaktown's
// admin/dashboard.html. Not a secret (Supabase anon keys are meant to be
// public; RLS is the real access control). Overridable via env in case the
// project is ever rotated.
const OLDOAKTOWN_SUPABASE_URL = process.env.OLDOAKTOWN_SUPABASE_URL
  ?? 'https://mvttihozhozigtrwqsyy.supabase.co';
const OLDOAKTOWN_SUPABASE_ANON_KEY = process.env.OLDOAKTOWN_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dHRpaG96aG96aWd0cndxc3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDU5NTYsImV4cCI6MjA4NzYyMTk1Nn0.g2GdUhXuxZm_EpF_WknmPAUNbrRqnqFTB5p0bpQvVlU';

export interface OldOakBusiness {
  id:             string;
  business_name:  string;
  category:       string | null;
  email:          string;
  phone:          string | null;
  address:        string | null;
  postcode:       string | null;
  description:    string | null;
  website:        string | null;
  instagram:      string | null;
  twitter:        string | null;
  linkedin:       string | null;
  tier:           string;
  status:         string;
  created_at:     string;
  approved_at:    string | null;
}

export interface OldOakEvent {
  id:              string;
  title:           string;
  description:     string | null;
  category:        string | null;
  event_date:      string | null;
  start_time:      string | null;
  end_time:        string | null;
  location:        string | null;
  postcode:        string | null;
  organiser_name:  string | null;
  status:          string;
  source:          string | null;
}

async function fetchBusinesses(query: string): Promise<OldOakBusiness[] | null> {
  try {
    const res = await fetch(`${OLDOAKTOWN_SUPABASE_URL}/rest/v1/businesses?${query}`, {
      headers: {
        apikey:        OLDOAKTOWN_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${OLDOAKTOWN_SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as OldOakBusiness[];
  } catch {
    return null;
  }
}

// Pending: 'pending' (free tier awaiting review) or 'pending_payment' (paid
// tier awaiting Stripe checkout) — only the former needs an admin decision,
// but both are surfaced so nothing paid-and-stuck goes unnoticed.
export function fetchPendingBusinesses(): Promise<OldOakBusiness[] | null> {
  return fetchBusinesses('status=in.(pending,pending_payment)&order=created_at.desc');
}

export function fetchApprovedBusinesses(): Promise<OldOakBusiness[] | null> {
  return fetchBusinesses('status=eq.approved&order=approved_at.desc&limit=200');
}

export async function fetchPendingEvents(): Promise<OldOakEvent[] | null> {
  const password = process.env.OLDOAKTOWN_ADMIN_PASSWORD;
  if (!password) return null;
  try {
    const res = await fetch(`${OLDOAKTOWN_SITE_URL}/api/approve-event`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'list', password }),
      cache:   'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: OldOakEvent[] };
    return (data.events ?? []).filter(e => e.status === 'pending');
  } catch {
    return null;
  }
}
