// ── Bible in a Year: the default reading ─────────────────────────────────────
// A straight-through plan: Genesis to Revelation, 1,189 chapters spread evenly
// across the calendar year (about three a day), starting on 1 January. It is a
// stand-in so the header always shows something sensible; if Didi follows a
// specific plan, she can type today's reading over it (see FaithHeader), and
// that override is stored for the day.

const BOOKS: [string, number][] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5],
  ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9],
  ['Obadiah', 1], ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3],
  ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14], ['Malachi', 4],
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28],
  ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6], ['Ephesians', 6],
  ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3], ['1 Timothy', 6],
  ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5],
  ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1], ['3 John', 1],
  ['Jude', 1], ['Revelation', 22],
];

export const TOTAL_CHAPTERS = BOOKS.reduce((n, [, c]) => n + c, 0); // 1,189

/** Book and chapter for a 0-based chapter index across the whole Bible. */
function locate(index: number): { book: string; chapter: number } {
  let rest = index;
  for (const [book, count] of BOOKS) {
    if (rest < count) return { book, chapter: rest + 1 };
    rest -= count;
  }
  const [book, count] = BOOKS[BOOKS.length - 1];
  return { book, chapter: count };
}

export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((today - start) / 86_400_000);
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

export interface BibleReading {
  day: number;
  daysInYear: number;
  /** e.g. "Isaiah 58–60" or "Genesis 49 – Exodus 2" */
  reading: string;
  /** 0–100, how far through the year's plan this day's reading ends. */
  percent: number;
}

/** Today's reading on the straight-through plan, from the device's local date. */
export function readingFor(d: Date): BibleReading {
  const year = d.getFullYear();
  const n = daysInYear(year);
  const day = dayOfYear(d);
  const first = Math.floor(((day - 1) * TOTAL_CHAPTERS) / n);
  const last = Math.floor((day * TOTAL_CHAPTERS) / n) - 1;
  const a = locate(first);
  const b = locate(Math.max(first, last));
  let reading: string;
  if (a.book !== b.book) reading = `${a.book} ${a.chapter} – ${b.book} ${b.chapter}`;
  else if (a.chapter === b.chapter) reading = `${a.book} ${a.chapter}`;
  else reading = `${a.book} ${a.chapter}–${b.chapter}`;
  return { day, daysInYear: n, reading, percent: Math.round((day / n) * 100) };
}
