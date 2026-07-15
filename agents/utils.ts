import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { CoordinatorData } from './types.js';

// Load .env.local for API keys when running outside Next.js
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ── Supabase client ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export async function pushSiteDataToSupabase(
  siteId: string,
  subagentStatus: unknown,
  graderVerdict: unknown,
  reviewQueue: unknown,
): Promise<void> {
  await supabase.from('pipeline_site_data').upsert({
    site_id:         siteId,
    subagent_status: subagentStatus,
    grader_verdict:  graderVerdict,
    review_queue:    reviewQueue,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'site_id' });
}

// Append this run's drafts to the permanent, append-only content library — one
// row per site/week/day/platform. Unlike pipeline_site_data (which holds only
// the latest run per site), this accumulates every week for repurposing.
// Re-running the same week upserts in place rather than duplicating.
export async function appendToContentLibrary(
  siteId: string,
  weekCommencing: string,
  items: {
    dayName: string;
    platform: string;
    graderVerdict: string;
    retryCount?: number;
    fullContent: string;
    generatedAt: string;
  }[],
): Promise<void> {
  if (items.length === 0) return;

  const rows = items.map(it => ({
    site_id:         siteId,
    week_commencing: weekCommencing,
    day_name:        it.dayName,
    platform:        it.platform,
    grader_verdict:  it.graderVerdict,
    retry_count:     it.retryCount ?? 0,
    content:         it.fullContent,
    generated_at:    it.generatedAt,
  }));

  await supabase
    .from('content_library')
    .upsert(rows, { onConflict: 'site_id,week_commencing,day_name,platform' });
}

// Read the weekly plan from Supabase (the source of truth). Falls back to the
// local content-coordinator.json ONLY if Supabase is unreachable or has no plan
// row. Logs which source was used so pipeline runs are auditable.
export async function getWeeklyPlan(): Promise<CoordinatorData> {
  try {
    const { data, error } = await supabase
      .from('weekly_plan')
      .select('*')
      .order('week_commencing', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      logOk(`Weekly plan loaded from Supabase (week commencing ${data.week_commencing})`);
      return {
        weekCommencing:    data.week_commencing as string,
        campaignObjective: (data.campaign_objective as string | null) ?? undefined,
        setAt:             (data.set_at as string) ?? now(),
        sites:             (data.sites as CoordinatorData['sites']) ?? {},
      };
    }
    logWarn('No weekly_plan row in Supabase — falling back to content-coordinator.json');
  } catch (err) {
    logWarn(`Supabase weekly_plan unreachable (${err instanceof Error ? err.message : String(err)}) — falling back to content-coordinator.json`);
  }

  const fallback = readJson<CoordinatorData>(coordinatorPath());
  logOk('Weekly plan loaded from local content-coordinator.json (fallback)');
  return fallback;
}

// ── Claude client ─────────────────────────────────────────────────────────────

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL_GENERATION = 'claude-sonnet-4-6';   // coordinator, subagents
export const MODEL_GRADING    = 'claude-haiku-4-5-20251001'; // graders — simpler task, faster

// ── File paths ────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(process.cwd(), 'data');

export function coordinatorPath(): string {
  return path.join(DATA_ROOT, 'content-coordinator.json');
}

export function sitePath(siteId: string, filename: string): string {
  return path.join(DATA_ROOT, 'sites', siteId, filename);
}

export function sessionPath(runId: string): string {
  return path.join(DATA_ROOT, 'sessions', `${runId}.json`);
}

// ── File I/O ──────────────────────────────────────────────────────────────────

export function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// ── Claude helper ─────────────────────────────────────────────────────────────

export async function ask(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1024,
): Promise<string> {
  const response = await claude.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

export function parseJson<T>(text: string): T {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  // Extract the first complete JSON object/array, ignoring any trailing text
  const start = cleaned.search(/[{[]/);
  if (start !== -1) {
    const opener = cleaned[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        depth--;
        if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1)) as T;
      }
    }
  }
  return JSON.parse(cleaned) as T;
}

// ── Console helpers ───────────────────────────────────────────────────────────

export function log(msg: string): void {
  console.log(msg);
}

export function logStep(emoji: string, msg: string): void {
  console.log(`\n${emoji}  ${msg}`);
}

export function logOk(msg: string): void {
  console.log(`  ✓  ${msg}`);
}

export function logWarn(msg: string): void {
  console.log(`  ⚠  ${msg}`);
}

export function logError(msg: string): void {
  console.log(`  ✗  ${msg}`);
}

export function now(): string {
  return new Date().toISOString();
}

export function nextSunday(): string {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(23, 0, 0, 0);
  return d.toISOString();
}
