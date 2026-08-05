// ── Week/date helpers shared by WeekContext, the home page and the Library
// week/month views. All week keys are the Monday of that week as YYYY-MM-DD.

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Monday (YYYY-MM-DD) of the week containing `d` (defaults to now).
export function mondayOf(d: Date = new Date()): string {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(monday.getDate() + diff);
  return toISODate(monday);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addWeeks(isoDate: string, weeks: number): string {
  return addDays(isoDate, weeks * 7);
}

// The seven YYYY-MM-DD dates of the week starting at `monday`, Monday-first.
export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function weekdayShort(isoDate: string): string {
  return WEEKDAY_NAMES[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

export function dayOfMonth(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDate();
}

// "W/C 03 AUG 2026"
export function formatWeekChip(monday: string): string {
  const d = new Date(`${monday}T00:00:00Z`);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `W/C ${dd} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// day_name ("Monday".."Friday") + week_commencing -> the calendar date it falls on.
const DAY_NAME_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6,
};

export function dateForDayName(weekCommencing: string, dayName: string | null): string | null {
  if (!dayName || !(dayName in DAY_NAME_OFFSET)) return null;
  return addDays(weekCommencing, DAY_NAME_OFFSET[dayName]);
}

// First-of-month (YYYY-MM-01) for the month containing `monday`.
export function monthOf(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonths(isoMonth: string, months: number): string {
  const d = new Date(`${isoMonth}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return `${d.toISOString().slice(0, 7)}-01`;
}

export function formatMonthLabel(isoMonth: string): string {
  const d = new Date(`${isoMonth}T00:00:00Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// The Monday-first 6-week grid (42 cells) covering `isoMonth`, including
// leading/trailing days from neighbouring months.
export function monthGrid(isoMonth: string): string[] {
  const first = new Date(`${isoMonth}T00:00:00Z`);
  const firstWeekday = first.getUTCDay(); // 0=Sun…6=Sat
  const leadingDays = firstWeekday === 0 ? 6 : firstWeekday - 1; // days before Monday
  const gridStart = addDays(isoMonth, -leadingDays);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
