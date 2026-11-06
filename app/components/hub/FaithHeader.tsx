'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { readingFor } from '@/app/lib/hub/bible';
import { daysUntil, greeting, isoDay, longDate, shortDate } from '@/app/lib/hub/dates';
import { Card, DISPLAY_FONT, Notice, btn, btnQuiet, input } from './ui';
import { useFaith } from './useFaith';
import { useNow } from './useNow';

// Page header: the masthead, then Didi's faith for the day. Word for Today,
// Bible in a Year, prayer points and the fast focus. Each card edits in place
// (the Word and the fast are hers to write; the reading has a default she can
// type over if she follows a specific plan).

const NAV = [
  { href: '/plan', label: 'Weekly Plan' },
  { href: '/review', label: 'Review' },
  { href: '/newsletters', label: 'Newsletters' },
  { href: '/friday', label: 'Friday' },
  { href: '/library', label: 'Library' },
  { href: '/social', label: 'Social' },
  { href: '/video-studio', label: 'Video Studio' },
  { href: '/ops', label: 'Content pipeline' },
  { href: '/guide', label: 'Ops Guide' },
];

const JUMP = [
  { href: '#health', label: 'Health check' },
  { href: '#today', label: 'Today' },
  { href: '#overnight', label: 'Overnight' },
  { href: '#insights', label: 'Insights' },
];

function FaithCard({ title, onEdit, editing, children }: { title: string; onEdit: () => void; editing: boolean; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-news-gold-ink">{title}</h3>
        {!editing && (
          <button type="button" onClick={onEdit} className="min-h-11 min-w-11 rounded-md px-2 text-xs font-semibold text-news-ink-2 underline underline-offset-2">
            Edit<span className="sr-only"> {title}</span>
          </button>
        )}
      </div>
      {children}
    </Card>
  );
}

function Actions({ onCancel, onClear }: { onCancel: () => void; onClear?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" className={btn}>Save</button>
      <button type="button" onClick={onCancel} className={btnQuiet}>Cancel</button>
      {onClear && <button type="button" onClick={onClear} className={btnQuiet}>Clear</button>}
    </div>
  );
}

export default function FaithHeader() {
  const now = useNow();
  const { faith, loaded, deviceOnly, saveError, save } = useFaith();
  const [editing, setEditing] = useState<null | 'word' | 'bible' | 'prayer' | 'fast'>(null);
  const done = () => setEditing(null);

  const today = now ? isoDay(now) : '';
  const reading = now ? readingFor(now) : null;
  const bibleText = faith.bible && faith.bible.date === today ? faith.bible.reading : reading?.reading;
  const wordIsToday = faith.word?.date === today;
  const fastDays = faith.fast?.until && now ? daysUntil(faith.fast.until, now) : null;

  return (
    <header>
      {/* ── Masthead ── */}
      <div className="news-night bg-news-night text-news-paper">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-news-gold">Command Hub</p>
            <p className="text-xs text-news-night-2" suppressHydrationWarning>{now ? longDate(now) : ' '}</p>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl" style={DISPLAY_FONT}>
            {now ? greeting(now) : 'Hello'}, Didi
          </h1>
          <div className="mt-3 h-1 w-24 rounded-full bg-news-gold" aria-hidden="true" />

          <nav aria-label="Sections on this page" className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {JUMP.map(j => (
              <a key={j.href} href={j.href} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-news-gold/60 px-4 text-sm font-semibold text-news-gold hover:bg-news-gold hover:text-news-ink">
                {j.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Other Hub pages" className="mt-1 flex gap-1 overflow-x-auto">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2.5 text-xs text-news-night-2 underline-offset-4 hover:text-news-paper hover:underline">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Faith ── */}
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-news-ink pb-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-news-gold-ink">Faith</p>
            <h2 id="faith-h" className="text-2xl font-semibold leading-tight" style={DISPLAY_FONT}>Start with this</h2>
          </div>
        </div>

        {deviceOnly && loaded && (
          <div className="mb-3">
            <Notice>
              <strong>Saved on this device only.</strong>{' '}The shared store isn&rsquo;t set up yet, so what you edit here stays in this browser and won&rsquo;t show on your other devices.
            </Notice>
          </div>
        )}
        {saveError && <div className="mb-3"><Notice>That edit couldn&rsquo;t be saved. Check it and try again.</Notice></div>}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Word for Today */}
          <FaithCard title="Word for Today" editing={editing === 'word'} onEdit={() => setEditing('word')}>
            {editing === 'word' ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  save({ word: { reference: String(f.get('reference')), text: String(f.get('text')), date: today } });
                  done();
                }}
              >
                <label className="text-sm font-medium">Reference
                  <input name="reference" defaultValue={faith.word?.reference ?? ''} maxLength={100} className={`${input} mt-1`} placeholder="e.g. Psalm 37:5" />
                </label>
                <label className="text-sm font-medium">Word
                  <textarea name="text" defaultValue={faith.word?.text ?? ''} maxLength={800} rows={5} className={`${input} mt-1`} />
                </label>
                <Actions onCancel={done} onClear={() => { save({ word: null }); done(); }} />
              </form>
            ) : faith.word ? (
              <>
                <blockquote className="text-lg leading-snug" style={DISPLAY_FONT}>&ldquo;{faith.word.text}&rdquo;</blockquote>
                <p className="text-sm font-semibold text-news-gold-ink">{faith.word.reference}</p>
                {!wordIsToday && <p className="text-xs text-news-ink-3">Set for {shortDate(faith.word.date)}. Add today&rsquo;s word when you have it.</p>}
              </>
            ) : (
              <p className="text-sm text-news-ink-2">{loaded ? 'No word set yet. Add today’s word.' : 'Loading…'}</p>
            )}
          </FaithCard>

          {/* Bible in a Year */}
          <FaithCard title="Bible in a Year" editing={editing === 'bible'} onEdit={() => setEditing('bible')}>
            {editing === 'bible' ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  save({ bible: { reading: String(new FormData(e.currentTarget).get('reading')), date: today } });
                  done();
                }}
              >
                <label className="text-sm font-medium">Today&rsquo;s reading
                  <input name="reading" defaultValue={faith.bible?.date === today ? faith.bible.reading : ''} maxLength={120} className={`${input} mt-1`} placeholder="Leave empty to use the default plan" />
                </label>
                <p className="text-xs text-news-ink-3">Following a specific plan? Type today&rsquo;s reading here. It applies for today only.</p>
                <Actions onCancel={done} onClear={() => { save({ bible: null }); done(); }} />
              </form>
            ) : reading ? (
              <>
                <p className="text-2xl font-semibold leading-tight" style={DISPLAY_FONT}>{bibleText}</p>
                <p className="text-sm text-news-ink-2">Day {reading.day} of {reading.daysInYear}</p>
                <div className="h-2 overflow-hidden rounded-full bg-news-gold-tint" role="img" aria-label={`${reading.percent}% of the way through the year`}>
                  <div className="h-full rounded-full bg-news-gold-ink" style={{ width: `${reading.percent}%` }} />
                </div>
                <p className="text-xs text-news-ink-3">
                  {faith.bible?.date === today ? 'Your own reading for today.' : 'Straight through, Genesis to Revelation. Edit to use your own plan.'}
                </p>
              </>
            ) : <p className="text-sm text-news-ink-2">Loading…</p>}
          </FaithCard>

          {/* Prayer points */}
          <FaithCard title="Today’s prayer points" editing={editing === 'prayer'} onEdit={() => setEditing('prayer')}>
            {editing === 'prayer' ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  const lines = String(new FormData(e.currentTarget).get('points')).split('\n');
                  save({ prayerPoints: lines.map(l => l.trim()).filter(Boolean).slice(0, 12) });
                  done();
                }}
              >
                <label className="text-sm font-medium">One per line
                  <textarea name="points" defaultValue={faith.prayerPoints.join('\n')} rows={6} className={`${input} mt-1`} />
                </label>
                <Actions onCancel={done} />
              </form>
            ) : faith.prayerPoints.length ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {faith.prayerPoints.map((p, i) => (
                  <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-news-gold-ink">✦</span><span>{p}</span></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-news-ink-2">{loaded ? 'No prayer points yet. Add them.' : 'Loading…'}</p>
            )}
          </FaithCard>

          {/* Fast focus */}
          <FaithCard title="Fast focus" editing={editing === 'fast'} onEdit={() => setEditing('fast')}>
            {editing === 'fast' ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  save({ fast: { focus: String(f.get('focus')), detail: String(f.get('detail')), until: String(f.get('until')) || null } });
                  done();
                }}
              >
                <label className="text-sm font-medium">What you&rsquo;re fasting and praying for
                  <input name="focus" defaultValue={faith.fast?.focus ?? ''} maxLength={200} className={`${input} mt-1`} />
                </label>
                <label className="text-sm font-medium">Notes (optional)
                  <textarea name="detail" defaultValue={faith.fast?.detail ?? ''} maxLength={500} rows={3} className={`${input} mt-1`} />
                </label>
                <label className="text-sm font-medium">Last day of the fast (optional)
                  <input name="until" type="date" defaultValue={faith.fast?.until ?? ''} className={`${input} mt-1`} />
                </label>
                <Actions onCancel={done} onClear={() => { save({ fast: null }); done(); }} />
              </form>
            ) : faith.fast ? (
              <>
                <p className="text-lg font-semibold leading-snug" style={DISPLAY_FONT}>{faith.fast.focus}</p>
                {faith.fast.detail && <p className="text-sm text-news-ink-2">{faith.fast.detail}</p>}
                {faith.fast.until && fastDays !== null && (
                  <p className="text-xs font-semibold text-news-gold-ink">
                    {fastDays > 0 ? `${fastDays} day${fastDays === 1 ? '' : 's'} left · ends ${shortDate(faith.fast.until)}` : fastDays === 0 ? 'Last day today' : `Ended ${shortDate(faith.fast.until)}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-news-ink-2">{loaded ? 'No fast set. Add a focus if you’re fasting.' : 'Loading…'}</p>
            )}
          </FaithCard>
        </div>
      </div>
    </header>
  );
}
