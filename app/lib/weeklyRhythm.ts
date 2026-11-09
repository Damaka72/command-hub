// ── The weekly rhythm, as one source of truth ────────────────────────────
// Saturday: Cowork researches, drafts and checks. Sunday: Didi decides on the
// flagged posts and approves the rest (about 15 minutes); Cowork schedules.
// Mon–Thu: it publishes itself (Wednesday: Cowork's news check). Friday:
// today's post still goes out, then review the week's numbers before Saturday
// starts again. Used by TodayFocus (the Home
// orientation banner) and the header's day hints, so a newcomer sees the
// same story everywhere in the Hub.

export type RhythmDay = {
  /** JS Date#getDay() value this entry applies to (0 = Sunday … 6 = Saturday). */
  dayOfWeek: number;
  dayName: string;
  /** Short day label used in compact chips, e.g. "Sat". */
  dayShort: string;
  /** Who does the work — colors the entry consistently with the rest of the Hub. */
  who: 'you' | 'auto';
  /** One or two words for the rhythm stepper, e.g. "Draft". */
  stepLabel: string;
  /** Slightly longer label for the Today banner's headline chip. */
  badge: string;
  title: string;
  description: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  accent: string;
  accentBg: string;
  accentBorder: string;
};

export const WEEKLY_RHYTHM: RhythmDay[] = [
  {
    dayOfWeek: 6,
    dayName: 'Saturday',
    dayShort: 'Sat',
    who: 'auto',
    stepLabel: 'Cowork drafts',
    badge: 'Cowork researches & drafts',
    title: "Cowork researches, drafts and checks the week",
    description: "At 06:55 Cowork researches each brand, drafts the week, runs the Brand gate and makes the cards. Nothing to do unless you want to steer it: set your weekly focus before then.",
    primary: { label: 'Set weekly focus', href: '/plan' },
    accent: 'var(--ok)',
    accentBg: 'color-mix(in srgb, var(--ok) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--ok) 30%, transparent)',
  },
  {
    dayOfWeek: 0,
    dayName: 'Sunday',
    dayShort: 'Sun',
    who: 'you',
    stepLabel: 'Review',
    badge: 'Sunday review, 15 minutes',
    title: 'Decide the flagged posts, approve the rest',
    description: "Open the Sunday review. Decide the flagged and blocked posts, approve everything ready in one action, and check the media list. Cowork schedules what you approve. Then finish the newsletters.",
    primary: { label: 'Open Sunday review', href: '/review' },
    secondary: { label: 'Newsletters', href: '/newsletters' },
    accent: 'var(--hub-accent-text)',
    accentBg: 'var(--hub-accent-dim)',
    accentBorder: 'var(--hub-accent)',
  },
  {
    dayOfWeek: 1,
    dayName: 'Monday',
    dayShort: 'Mon',
    who: 'auto',
    stepLabel: 'Publishing',
    badge: 'Publishing',
    title: "Today's posts go out automatically",
    description: "Blotato publishes what you approved on Sunday, on schedule — nothing to do here. Just a quick check below that sites are up and nothing's stuck.",
    accent: 'var(--ok)',
    accentBg: 'color-mix(in srgb, var(--ok) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--ok) 30%, transparent)',
  },
  {
    dayOfWeek: 2,
    dayName: 'Tuesday',
    dayShort: 'Tue',
    who: 'auto',
    stepLabel: 'Publishing',
    badge: 'Publishing',
    title: "Today's posts go out automatically",
    description: "Blotato publishes what you approved on Sunday, on schedule — nothing to do here. Just a quick check below that sites are up and nothing's stuck.",
    accent: 'var(--ok)',
    accentBg: 'color-mix(in srgb, var(--ok) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--ok) 30%, transparent)',
  },
  {
    dayOfWeek: 3,
    dayName: 'Wednesday',
    dayShort: 'Wed',
    who: 'auto',
    stepLabel: 'News check',
    badge: 'Publishing + news check',
    title: "Today's posts go out, and Cowork checks the news",
    description: "At 07:00 Cowork looks for real news for each brand. If it drafts a reactive post you'll see it in the Sunday review page to say yes or no today. If nothing real has happened, it says so and posts nothing extra.",
    accent: 'var(--ok)',
    accentBg: 'color-mix(in srgb, var(--ok) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--ok) 30%, transparent)',
  },
  {
    dayOfWeek: 4,
    dayName: 'Thursday',
    dayShort: 'Thu',
    who: 'auto',
    stepLabel: 'Publishing',
    badge: 'Publishing',
    title: "Today's posts go out automatically",
    description: "Blotato publishes what you approved on Sunday, on schedule — nothing to do here. Just a quick check below that sites are up and nothing's stuck.",
    accent: 'var(--ok)',
    accentBg: 'color-mix(in srgb, var(--ok) 10%, transparent)',
    accentBorder: 'color-mix(in srgb, var(--ok) 30%, transparent)',
  },
  {
    dayOfWeek: 5,
    dayName: 'Friday',
    dayShort: 'Fri',
    who: 'you',
    stepLabel: 'Review',
    badge: 'Publish & review the week',
    title: "Today's post goes out — then review how the week went",
    description: 'Once the last of this week’s content publishes, check planned vs published, revenue, and subscriber counts before Saturday’s research starts again.',
    primary: { label: 'Open Friday Report', href: '/friday' },
    accent: 'var(--hub-accent-text)',
    accentBg: 'var(--hub-accent-dim)',
    accentBorder: 'var(--hub-accent)',
  },
];

/** WEEKLY_RHYTHM ordered Saturday → Friday, the order the business week actually runs in. */
export const WEEKLY_RHYTHM_ORDER: RhythmDay[] = [
  WEEKLY_RHYTHM[0], // Sat
  WEEKLY_RHYTHM[1], // Sun
  WEEKLY_RHYTHM[2], // Mon
  WEEKLY_RHYTHM[3], // Tue
  WEEKLY_RHYTHM[4], // Wed
  WEEKLY_RHYTHM[5], // Thu
  WEEKLY_RHYTHM[6], // Fri
];

export function rhythmForDay(dayOfWeek: number): RhythmDay {
  return WEEKLY_RHYTHM.find(d => d.dayOfWeek === dayOfWeek) ?? WEEKLY_RHYTHM[0];
}
