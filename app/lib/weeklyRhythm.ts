// ── The weekly rhythm, as one source of truth ────────────────────────────
// Saturday: research + draft. Sunday: post + schedule. Mon–Thu: it publishes
// itself. Friday: today's post still goes out, then review the week's
// numbers before Saturday starts again. Used by TodayFocus (the Home
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
    who: 'you',
    stepLabel: 'Draft',
    badge: 'Research & draft',
    title: "Research this week, then set the plan",
    description: "Generate each site's research brief and pick a content pillar and theme for the week on Weekly Plan — that's what the pipeline reads when you run it.",
    primary: { label: 'Open Weekly Plan', href: '/plan' },
    accent: 'var(--hub-accent-text)',
    accentBg: 'var(--hub-accent-dim)',
    accentBorder: 'var(--hub-accent)',
  },
  {
    dayOfWeek: 0,
    dayName: 'Sunday',
    dayShort: 'Sun',
    who: 'you',
    stepLabel: 'Post & schedule',
    badge: 'Post & schedule',
    title: 'Review drafts, approve, and push to Blotato',
    description: "Edit and approve this week's drafts in the Review Queue, then push. Use the Sunday checklist in there for media posts, and finish off the newsletters.",
    primary: { label: 'Open Review Queue', href: '/review' },
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
    accent: '#34d399',
    accentBg: 'rgba(16,185,129,0.1)',
    accentBorder: 'rgba(16,185,129,0.3)',
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
    accent: '#34d399',
    accentBg: 'rgba(16,185,129,0.1)',
    accentBorder: 'rgba(16,185,129,0.3)',
  },
  {
    dayOfWeek: 3,
    dayName: 'Wednesday',
    dayShort: 'Wed',
    who: 'auto',
    stepLabel: 'Publishing',
    badge: 'Publishing',
    title: "Today's posts go out automatically",
    description: "Blotato publishes what you approved on Sunday, on schedule — nothing to do here. Just a quick check below that sites are up and nothing's stuck.",
    accent: '#34d399',
    accentBg: 'rgba(16,185,129,0.1)',
    accentBorder: 'rgba(16,185,129,0.3)',
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
    accent: '#34d399',
    accentBg: 'rgba(16,185,129,0.1)',
    accentBorder: 'rgba(16,185,129,0.3)',
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
