// ── Old Oak Town Edition → research brief ────────────────────────────────
// Old Oak Town curates real news, events and videos and publishes them as a
// weekly "Edition" (https://oldoaktown.co.uk/data/editions/latest.json, built
// by the oldoaktown repo's weekly-edition job). This turns that Edition into a
// research brief for the coordinator, so the week's social posts are grounded
// in what is actually published on the site rather than invented.
//
// Read-only and fail-safe: if the Edition can't be fetched, is malformed or is
// stale, this returns undefined and the pipeline behaves exactly as before.

const EDITION_URL =
  process.env.OLDOAKTOWN_EDITION_URL ?? 'https://oldoaktown.co.uk/data/editions/latest.json';
const MAX_AGE_DAYS = 10;

interface EditionNews { title: string; excerpt?: string; source?: string; url?: string; date?: string }
interface EditionEvent { title: string; date: string; startTime?: string | null; venue?: string; address?: string; url?: string }
interface EditionVideo { title: string; channel?: string; url?: string }
interface Edition {
  date: string;
  news?: EditionNews[];
  events?: EditionEvent[];
  videos?: EditionVideo[];
}

const clean = (s: unknown, max = 220): string =>
  String(s ?? '').replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, max);

export function formatEditionBrief(edition: Edition): string | undefined {
  const news = (edition.news ?? []).slice(0, 6);
  const events = (edition.events ?? []).slice(0, 6);
  const videos = (edition.videos ?? []).slice(0, 2);
  if (news.length + events.length + videos.length === 0) return undefined;

  const lines: string[] = [
    `REAL SOURCE MATERIAL — Old Oak Town's curated Edition dated ${clean(edition.date, 10)}.`,
    'Base each day\'s brief on a DIFFERENT item below. Use ONLY facts stated here: never invent',
    'names, dates, venues, figures or quotes. Credit the original source for news and video items',
    'and point readers to oldoaktown.co.uk for the full picture. If no item fits a given day,',
    'fall back to the weekly pillar rather than making something up.',
  ];

  if (news.length) {
    lines.push('', 'NEWS:');
    news.forEach((n, i) => {
      lines.push(`${i + 1}. ${clean(n.title)} — via ${clean(n.source || 'source', 60)}${n.date ? ` (${clean(n.date, 10)})` : ''}${n.excerpt ? `: ${clean(n.excerpt)}` : ''}`);
    });
  }
  if (events.length) {
    lines.push('', 'EVENTS (upcoming):');
    events.forEach((e, i) => {
      const when = `${clean(e.date, 10)}${e.startTime ? ' ' + clean(e.startTime, 5) : ''}`;
      const where = [e.venue, e.address].filter(Boolean).map(v => clean(v, 80)).join(', ');
      lines.push(`${i + 1}. ${clean(e.title)} — ${when}${where ? ` — ${where}` : ''}`);
    });
  }
  if (videos.length) {
    lines.push('', 'VIDEOS:');
    videos.forEach((v, i) => {
      lines.push(`${i + 1}. ${clean(v.title)}${v.channel ? ` — ${clean(v.channel, 60)}` : ''}`);
    });
  }
  return lines.join('\n');
}

export async function getOldOakEditionBrief(now: Date = new Date()): Promise<string | undefined> {
  try {
    const res = await fetch(EDITION_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return undefined;
    const edition = (await res.json()) as Edition;

    const ageDays = (now.getTime() - new Date(`${edition.date}T12:00:00Z`).getTime()) / 86400000;
    if (!Number.isFinite(ageDays) || ageDays > MAX_AGE_DAYS || ageDays < -1) return undefined;

    return formatEditionBrief(edition);
  } catch {
    return undefined;
  }
}
