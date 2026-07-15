import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Shared server-side Supabase client for API routes, using the public anon key.
// The Hub's tables grant the anon role read/write, so this is sufficient for the
// app's reads and writes. Lazily created so a missing env var doesn't crash import.
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  return (_supabase ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ));
}
