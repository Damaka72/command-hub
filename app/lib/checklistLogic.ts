// ── Launch setup checklist — shared types and pure logic ─────────────────────
// Generic per site: a site gets a checklist by having a file in data/checklists/
// (see data/checklists/README.md). No server-only imports, so the page, the server
// action and the tests all use the same rules.
//
// NO SECRETS, EVER. A checklist records only whether a secret or key is set (yes/no),
// never its value. looksLikeSecret() is the guard used when a file is read and when a
// note is saved.

export const CHECKLIST_STATUSES = ['todo', 'in_progress', 'done', 'blocked', 'not_needed'] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const CHECKLIST_OWNERS = ['didi', 'claude_code', 'either'] as const;
export type ChecklistOwner = (typeof CHECKLIST_OWNERS)[number];

export const STATUS_LABELS: Record<ChecklistStatus, string> = {
  todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked', not_needed: 'Not needed',
};
export const OWNER_LABELS: Record<ChecklistOwner, string> = { didi: 'Didi', claude_code: 'Claude Code', either: 'Either' };

export interface ChecklistPhase { id: string; title: string }

export interface ChecklistItem {
  id:             string;
  phase:          string;
  title:          string;
  owner:          ChecklistOwner;
  status:         ChecklistStatus;
  blocked_reason?: string;
  /** Two or three plain sentences saying exactly what to do. */
  instructions:   string;
  /** The dashboard or page to use, where there is one. */
  link?:          string;
  depends_on:     string[];
  notes?:         string;
  updated_at?:    string;
  /** Names of environment variables or keys this item involves. Only "set / not set" is ever recorded. */
  secret_names?:  string[];
  /** Names of environment variables that are set (yes/no only, never values). */
  secrets_set?:   string[];
  /** Key of an automatic check (see AUTO_CHECKS). A bonus: it never blocks manual ticking. */
  auto_check?:    string;
}

export interface ChecklistFile {
  siteId: string;
  name:   string;
  phases: ChecklistPhase[];
  items:  ChecklistItem[];
}

export const isChecklistStatus = (v: unknown): v is ChecklistStatus =>
  typeof v === 'string' && (CHECKLIST_STATUSES as readonly string[]).includes(v);

// ── Secret guard ────────────────────────────────────────────────────────────
const SECRET_PATTERNS: RegExp[] = [
  /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}/,        // Stripe keys
  /\bwhsec_[A-Za-z0-9]{8,}/,                          // Stripe webhook signing secret
  /\bre_[A-Za-z0-9_]{16,}/,                           // Resend API key
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,      // JWTs (Supabase keys)
  /\bsb_(secret|publishable)_[A-Za-z0-9_]{8,}/,       // new-style Supabase keys
  /\b0x4[A-Za-z0-9_-]{20,}/,                          // Cloudflare Turnstile keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:password|secret|token|api[_ -]?key)\s*[:=]\s*\S{8,}/i,
];

/** True if the text looks like it contains a key, token or password. Err on the side of refusing. */
export function looksLikeSecret(text: string | undefined | null): boolean {
  if (!text) return false;
  if (SECRET_PATTERNS.some(re => re.test(text))) return true;
  // Any long unbroken string with a random-looking mix of capitals, lower case and digits
  // (file names and web addresses are not mixed like this).
  return (text.match(/[A-Za-z0-9+=_-]{32,}/g) ?? []).some(tok =>
    (tok.match(/[A-Z]/g) ?? []).length >= 3 && (tok.match(/[a-z]/g) ?? []).length >= 3 && (tok.match(/\d/g) ?? []).length >= 2);
}

// ── Dependencies, progress, next action ─────────────────────────────────────
/** An item is complete when it is done or not needed. */
export const isComplete = (i: Pick<ChecklistItem, 'status'>) => i.status === 'done' || i.status === 'not_needed';

/** Items this one is still waiting on (not complete yet). */
export function waitingOn(item: ChecklistItem, all: ChecklistItem[]): ChecklistItem[] {
  const byId = new Map(all.map(i => [i.id, i]));
  return item.depends_on.map(id => byId.get(id)).filter((d): d is ChecklistItem => !!d && !isComplete(d));
}

/**
 * The Next action: the first item, in checklist order, that is not complete and whose
 * dependencies are all complete. (A blocked item can be the next action: it then shows
 * its reason, so nothing is hidden.)
 */
export function nextAction(items: ChecklistItem[]): ChecklistItem | null {
  return items.find(i => !isComplete(i) && waitingOn(i, items).length === 0) ?? null;
}

export interface Progress { total: number; complete: number; blocked: number }
export const progressOf = (items: ChecklistItem[]): Progress => ({
  total: items.length,
  complete: items.filter(isComplete).length,
  blocked: items.filter(i => i.status === 'blocked').length,
});

export interface PhaseProgress extends Progress { phase: ChecklistPhase; items: ChecklistItem[] }
export function byPhase(file: ChecklistFile): PhaseProgress[] {
  return file.phases.map(phase => {
    const items = file.items.filter(i => i.phase === phase.id);
    return { phase, items, ...progressOf(items) };
  });
}

export interface ChecklistSummary {
  siteId: string; name: string; complete: number; total: number; blocked: number;
  next: { id: string; title: string } | null;
}
export function summarise(file: ChecklistFile): ChecklistSummary {
  const p = progressOf(file.items);
  const next = nextAction(file.items);
  return { siteId: file.siteId, name: file.name, complete: p.complete, total: p.total, blocked: p.blocked, next: next ? { id: next.id, title: next.title } : null };
}

// ── Automatic checks (a bonus) ──────────────────────────────────────────────
/** Facts the directory's metrics feed can prove. Each returns true when the item can be auto-ticked. */
export interface AutoFacts { stripe_events_received?: number; visits_by_source_30d?: Record<string, number> }
export const AUTO_CHECKS: Record<string, { label: string; passes: (f: AutoFacts) => boolean }> = {
  stripe_webhook_event: {
    label: 'The Stripe webhook has received an event',
    passes: f => (f.stripe_events_received ?? 0) > 0,
  },
  visits_by_source: {
    label: 'Visits are being recorded by source',
    passes: f => Object.entries(f.visits_by_source_30d ?? {}).some(([s, n]) => s !== 'other' && n > 0),
  },
};

// ── Validation ──────────────────────────────────────────────────────────────
export function parseChecklistFile(raw: unknown, source: string): ChecklistFile {
  const fail = (msg: string): never => { throw new Error(`Checklist ${source}: ${msg}`); };
  if (!raw || typeof raw !== 'object') return fail('not a JSON object');
  const o = raw as Record<string, unknown>;
  const siteId = typeof o.siteId === 'string' && /^[a-z0-9-]+$/.test(o.siteId) ? o.siteId : fail('"siteId" must be lower-case letters, numbers and hyphens');
  const name = typeof o.name === 'string' && o.name ? o.name : fail('"name" is required');
  if (!Array.isArray(o.phases) || !o.phases.length) fail('"phases" must be a non-empty array');
  if (!Array.isArray(o.items) || !o.items.length) fail('"items" must be a non-empty array');

  const phases = (o.phases as unknown[]).map((p, i): ChecklistPhase => {
    const r = (p ?? {}) as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.title !== 'string') return fail(`phase ${i} needs "id" and "title"`);
    return { id: r.id, title: r.title };
  });
  const phaseIds = new Set(phases.map(p => p.id));

  const seen = new Set<string>();
  const items = (o.items as unknown[]).map((raw, i): ChecklistItem => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const id = typeof t.id === 'string' && t.id ? t.id : fail(`item ${i}: "id" is required`);
    if (seen.has(id)) fail(`duplicate item id "${id}"`);
    seen.add(id);
    const str = (k: string) => typeof t[k] === 'string' && (t[k] as string).trim() ? (t[k] as string) : fail(`${id}: "${k}" is required`);
    const opt = (k: string) => (typeof t[k] === 'string' && t[k] ? (t[k] as string) : undefined);
    const phase = str('phase');
    if (!phaseIds.has(phase)) fail(`${id}: unknown phase "${phase}"`);
    if (typeof t.owner !== 'string' || !(CHECKLIST_OWNERS as readonly string[]).includes(t.owner)) fail(`${id}: "owner" must be one of ${CHECKLIST_OWNERS.join(', ')}`);
    if (!isChecklistStatus(t.status)) fail(`${id}: "status" must be one of ${CHECKLIST_STATUSES.join(', ')}`);
    if (t.status === 'blocked' && !opt('blocked_reason')) fail(`${id}: a blocked item needs "blocked_reason"`);
    const depends = Array.isArray(t.depends_on) ? (t.depends_on as unknown[]) : [];
    if (!depends.every(d => typeof d === 'string')) fail(`${id}: "depends_on" must be a list of item ids`);
    const names = Array.isArray(t.secret_names) ? (t.secret_names as unknown[]).filter((x): x is string => typeof x === 'string') : undefined;
    const item: ChecklistItem = {
      id, phase, title: str('title'), owner: t.owner as ChecklistOwner, status: t.status as ChecklistStatus,
      blocked_reason: opt('blocked_reason'), instructions: str('instructions'), link: opt('link'),
      depends_on: depends as string[], notes: opt('notes'), updated_at: opt('updated_at'),
      secret_names: names, secrets_set: Array.isArray(t.secrets_set) ? (t.secrets_set as unknown[]).filter((x): x is string => typeof x === 'string') : undefined,
      auto_check: opt('auto_check'),
    };
    for (const k of ['title', 'instructions', 'notes', 'blocked_reason', 'link'] as const) {
      if (looksLikeSecret(item[k])) fail(`${id}: "${k}" looks like it contains a secret. Record only whether a secret is set.`);
    }
    if (item.auto_check && !AUTO_CHECKS[item.auto_check]) fail(`${id}: unknown auto_check "${item.auto_check}"`);
    return item;
  });
  const ids = new Set(items.map(i => i.id));
  for (const i of items) for (const d of i.depends_on) if (!ids.has(d)) fail(`${i.id}: depends on unknown item "${d}"`);
  return { siteId, name, phases, items };
}
