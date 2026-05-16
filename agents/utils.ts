import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

// ── Claude client ─────────────────────────────────────────────────────────────

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL_GENERATION = 'claude-sonnet-4-6';   // coordinator, subagents, dreaming
export const MODEL_GRADING    = 'claude-haiku-4-5-20251001'; // graders — simpler task, faster

// ── File paths ────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(process.cwd(), 'data');

export function coordinatorPath(): string {
  return path.join(DATA_ROOT, 'content-coordinator.json');
}

export function sitePath(siteId: string, filename: string): string {
  return path.join(DATA_ROOT, 'sites', siteId, filename);
}

export function dreamingPath(): string {
  return path.join(DATA_ROOT, 'dreaming-status.json');
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
