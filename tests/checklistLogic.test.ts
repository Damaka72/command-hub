import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  looksLikeSecret, nextAction, parseChecklistFile, progressOf, summarise, waitingOn, type ChecklistItem,
} from '../app/lib/checklistLogic';

const item = (id: string, over: Partial<ChecklistItem> = {}): ChecklistItem => ({
  id, phase: 'A', title: id, owner: 'didi', status: 'todo', instructions: 'Do it.', depends_on: [], ...over,
});

test('next action is the first incomplete item whose dependencies are complete', () => {
  const items = [item('A1', { status: 'done' }), item('A2', { depends_on: ['A3'] }), item('A3'), item('A4')];
  assert.equal(nextAction(items)?.id, 'A3'); // A2 is waiting on A3
  items[2].status = 'done';
  assert.equal(nextAction(items)?.id, 'A2');
  items[1].status = 'not_needed';
  assert.equal(nextAction(items)?.id, 'A4');
  items[3].status = 'done';
  assert.equal(nextAction(items), null);
});

test('a blocked item can be the next action and keeps its reason', () => {
  const items = [item('A1', { status: 'blocked', blocked_reason: 'Needs Vercel access' }), item('A2')];
  assert.equal(nextAction(items)?.blocked_reason, 'Needs Vercel access');
});

test('items wait for dependencies that are not done', () => {
  const items = [item('A1'), item('A2', { depends_on: ['A1'] })];
  assert.deepEqual(waitingOn(items[1], items).map(i => i.id), ['A1']);
  items[0].status = 'done';
  assert.equal(waitingOn(items[1], items).length, 0);
});

test('progress counts done and not needed as complete', () => {
  const p = progressOf([item('1', { status: 'done' }), item('2', { status: 'not_needed' }), item('3', { status: 'blocked', blocked_reason: 'x' }), item('4')]);
  assert.deepEqual(p, { total: 4, complete: 2, blocked: 1 });
});

test('looksLikeSecret catches real keys and lets plain sentences through', () => {
  for (const s of [
    'sk_test_' + 'a'.repeat(24), 'whsec_' + 'b'.repeat(20), 're_' + 'c'.repeat(24),
    'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9', 'password: hunter2hunter2', 'aB3dE5fG7hJ9kL1mN2pQ4rS6tU8vW0xY2zA4',
  ]) assert.equal(looksLikeSecret(s), true, s);
  for (const s of ['Set STRIPE_SECRET_KEY in Vercel (set)', 'The webhook secret is set.', 'Price IDs live in environment variables', 'Run supabase/migrations/20261113120000_checklist_item_state.sql in the SQL editor', 'https://github.com/Damaka72/command-hub/edit/main/app/lib/socialAccounts.ts', undefined, ''])
    assert.equal(looksLikeSecret(s), false, String(s));
});

const file = (items: unknown[]) => ({ siteId: 'x', name: 'X', phases: [{ id: 'A', title: 'A' }], items });
const raw = (id: string, over: Record<string, unknown> = {}) => ({ id, phase: 'A', title: id, owner: 'didi', status: 'todo', instructions: 'Do it.', depends_on: [], ...over });

test('a file is rejected if a note contains a secret', () => {
  assert.throws(() => parseChecklistFile(file([raw('A1', { notes: 'key is sk_live_' + 'z'.repeat(20) })]), 't'), /secret/);
});
test('a file is rejected for unknown dependencies, bad phases and blocked items without a reason', () => {
  assert.throws(() => parseChecklistFile(file([raw('A1', { depends_on: ['nope'] })]), 't'), /unknown item/);
  assert.throws(() => parseChecklistFile(file([raw('A1', { phase: 'Z' })]), 't'), /unknown phase/);
  assert.throws(() => parseChecklistFile(file([raw('A1', { status: 'blocked' })]), 't'), /blocked_reason/);
});
test('summarise gives the site-card line', () => {
  const f = parseChecklistFile(file([raw('A1', { status: 'done' }), raw('A2', { title: 'Create the four Stripe prices' })]), 't');
  assert.deepEqual(summarise(f), { siteId: 'x', name: 'X', complete: 1, total: 2, blocked: 0, next: { id: 'A2', title: 'Create the four Stripe prices' } });
});
