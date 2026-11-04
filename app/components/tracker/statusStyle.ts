// Visual treatment for tracker statuses, using the Hub's own tokens (globals.css).
// Status is never shown by colour alone: every use also carries the status word,
// and the glyph/pattern differs per status.

import type { TaskStatus } from '@/app/lib/trackerLogic';

export interface StatusStyle {
  /** Text and border colour — each is at least 4.5:1 on --panel and --panel-2. */
  color: string;
  glyph: string;
  /** Background for a meter segment (pattern differs per status, not just colour). */
  segment: string;
}

export const STATUS_STYLE: Record<TaskStatus, StatusStyle> = {
  done: {
    color: 'var(--ok)',
    glyph: '✓',
    segment: 'var(--ok)',
  },
  in_progress: {
    color: 'var(--hub-cyan)',
    glyph: '◐',
    segment: 'var(--hub-cyan)',
  },
  todo: {
    color: 'var(--fg-2)',
    glyph: '○',
    // Hollow: outline only
    segment: 'transparent',
  },
  parked: {
    // --fg-3 is only 4.46:1 on --panel-2, so text uses --fg-2; parked is told apart
    // by its glyph, dashed border and hatched meter segment as well as the word.
    color: 'var(--fg-2)',
    glyph: '❚❚',
    // Diagonal hatching (graphical, so --fg-3 clears the 3:1 non-text minimum)
    segment: 'repeating-linear-gradient(135deg, var(--fg-3) 0 2px, transparent 2px 6px)',
  },
};

/** Order the meter and legend always use. */
export const METER_ORDER: TaskStatus[] = ['done', 'in_progress', 'todo', 'parked'];
