// ── Newsletter draft queue ────────────────────────────────────────────────────
// GET /api/newsletters/queue?publication=X&weeks=12
//
// One publication's next N upcoming weeks (starting this week), each merged
// with its saved row if one exists. Lets Didi see — and fill in a Google Drive
// link for — several weeks of drafts at once, ahead of when the pipeline
// would otherwise generate that week's content. Distinct from the single-week
// workspace GET /api/newsletters, which the Draft tab's editor still uses.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/app/lib/supabase';
import { PUBLICATION_SLUGS } from '@/app/lib/siteConstants';
import { mondayOf, addWeeks } from '@/app/lib/weekDates';

export const dynamic = 'force-dynamic';

const DEFAULT_WEEKS = 12;
const MAX_WEEKS = 26;

export interface QueueWeek {
  week:           string;
  status:         string | null;
  driveLink:      string | null;
  subjectOptions: string[] | null;
  sentAt:         string | null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const publication = url.searchParams.get('publication');
    if (!publication || !PUBLICATION_SLUGS.includes(publication as never)) {
      return NextResponse.json({ error: 'valid publication is required' }, { status: 400 });
    }
    const weeksParam = Number(url.searchParams.get('weeks'));
    const weekCount = Number.isFinite(weeksParam) && weeksParam > 0
      ? Math.min(Math.trunc(weeksParam), MAX_WEEKS)
      : DEFAULT_WEEKS;

    const start = mondayOf();
    const end = addWeeks(start, weekCount - 1);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('newsletters')
      .select('week_commencing, status, drive_link, subject_options, sent_at')
      .eq('publication', publication)
      .gte('week_commencing', start)
      .lte('week_commencing', end);
    if (error) throw error;

    const byWeek = new Map((data ?? []).map(row => [row.week_commencing as string, row]));

    const weeks: QueueWeek[] = Array.from({ length: weekCount }, (_, i) => {
      const week = addWeeks(start, i);
      const row = byWeek.get(week);
      const opts = row?.subject_options;
      return {
        week,
        status:         row?.status ?? null,
        driveLink:      row?.drive_link ?? null,
        subjectOptions: Array.isArray(opts) ? (opts as unknown[]).filter((s): s is string => typeof s === 'string') : null,
        sentAt:         row?.sent_at ?? null,
      };
    });

    return NextResponse.json({ publication, weeks });
  } catch (err) {
    return NextResponse.json({ error: 'Could not load newsletter queue', detail: String(err) }, { status: 500 });
  }
}
