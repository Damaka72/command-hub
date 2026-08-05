// ── Home page quote panel (UX spec §3.3) ─────────────────────────────────────
// Operating principles, not generic inspiration — restating Didi's own
// strategy lands harder than borrowed motivation. Edit/extend this list
// directly; the panel picks one at random on load and the rotate button
// cycles through the rest.

export interface Quote {
  text:        string;
  attribution: string;
}

export const QUOTES: Quote[] = [
  { text: 'Consistency compounds. One week is noise. Twenty weeks is a business.', attribution: 'Operating principle' },
  { text: 'You do not need a bigger audience. You need a clearer promise.', attribution: 'Positioning' },
  { text: 'Scheduled beats perfect. Perfect never ships on a Sunday.', attribution: 'Sunday rule' },
  { text: 'Value earns trust. Trust drives sales. In that order, every time.', attribution: 'Commercial logic' },
  { text: 'Five sites is not five jobs. It is one system, run five ways.', attribution: 'The whole point' },
];
