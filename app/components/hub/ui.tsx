// Shared primitives for the morning-paper home page. Colours come from the
// `news-*` tokens in globals.css. Headings use Fraunces (the World of
// Contracts display face) so the page reads like a paper; body text stays on
// the Hub's Geist Sans.

import { Fraunces } from 'next/font/google';
import type { ReactNode } from 'react';

export const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const DISPLAY_FONT = { fontFamily: 'var(--font-display), Georgia, serif' } as const;

export type Tone = 'ok' | 'warn' | 'bad' | 'gold' | 'neutral';

const TONE: Record<Tone, string> = {
  ok: 'bg-news-ok-tint text-news-ok border-news-ok/30',
  warn: 'bg-news-warn-tint text-news-warn border-news-warn/30',
  bad: 'bg-news-bad-tint text-news-bad border-news-bad/30',
  gold: 'bg-news-gold-tint text-news-gold-ink border-news-gold-ink/30',
  neutral: 'bg-news-paper text-news-ink-2 border-news-rule',
};

/** Status pill: always a glyph and a word, never colour alone. */
export function Pill({ tone, glyph, children }: { tone: Tone; glyph?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {glyph && <span aria-hidden="true">{glyph}</span>}
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-news-rule bg-news-card p-4 shadow-[0_1px_0_rgba(23,20,15,0.04)] ${className}`}>{children}</div>;
}

/** Section heading with the gold rule — the paper's "section flag". */
export function SectionHead({ id, kicker, title, aside }: { id: string; kicker: string; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-news-ink pb-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-news-gold-ink">{kicker}</p>
        <h2 id={id} className="text-2xl font-semibold leading-tight text-news-ink" style={DISPLAY_FONT}>{title}</h2>
      </div>
      {aside && <div className="shrink-0 text-xs text-news-ink-3">{aside}</div>}
    </div>
  );
}

export function Section({ id, children }: { id: string; children: ReactNode }) {
  return <section aria-labelledby={`${id}-h`} id={id} className="scroll-mt-16 py-6">{children}</section>;
}

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'neutral' }) {
  return (
    <p role="status" className={`rounded-lg border p-3 text-sm ${tone === 'warn' ? 'border-news-warn/40 bg-news-warn-tint text-news-ink' : 'border-news-rule bg-news-card text-news-ink-2'}`}>
      {children}
    </p>
  );
}

export const btn =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-news-ink/80 bg-news-ink px-4 text-sm font-semibold text-news-paper transition hover:bg-news-ink-2';
export const btnQuiet =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-news-rule bg-news-card px-3 text-sm font-medium text-news-ink-2 transition hover:border-news-ink-3';
export const input =
  'w-full rounded-lg border border-news-ink-3/60 bg-news-card px-3 py-2 text-news-ink placeholder:text-news-ink-3';
