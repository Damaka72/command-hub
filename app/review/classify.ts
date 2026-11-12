// ── Sunday review: which bucket does a post belong in? ────────────────────────
// One pure function so the page, the summary band and the tests all agree.
// Order matters: the first matching rule wins.
//
//   scheduled     already pushed to Blotato
//   rejected      Didi (or the gate) rejected it
//   approved      Didi approved it and it can go out (waits for Cowork to schedule)
//   filming       approved or draft, but it is a video brief only Didi can film
//   needs_media   a media platform with no media attached yet
//   blocked       the Brand gate found a hard-rule breach: fix before approving
//   flagged       the Brand gate is unsure: Didi decides
//   ready         the Brand gate passed it: safe to approve in one action
//   unchecked     the Brand gate has not looked at it yet

export interface ReviewRow {
  id:                    string;
  site_id:               string;
  week_commencing:       string;
  day_name:              string;
  platform:              string;
  grader_verdict:        string | null;
  status:                string;
  content:               string;
  edited_content:        string | null;
  media_urls:            string[] | null;
  approved_at:           string | null;
  blotato_submission_id: string | null;
  scheduled_for:         string | null;
  push_error:            string | null;
  asset_type:            string | null;
  creation_tool:         string | null;
  drive_file_id:         string | null;
  asset_duration_s:      number | null;
  aspect_ratio:          string | null;
  creation_requested_at: string | null;
  // Added by 20261109120000_content_library_gate_and_layer.sql. Absent (undefined)
  // until that migration is applied.
  layer?:                string | null;
  gate_verdict?:         string | null;
  gate_reason?:          string | null;
  gate_checked_at?:      string | null;
}

export type Bucket =
  | 'scheduled' | 'failed' | 'rejected' | 'approved' | 'filming' | 'needs_media'
  | 'blocked' | 'flagged' | 'ready' | 'unchecked';

// Platforms that cannot publish without media attached. Mirrors the push route
// and agents/accounts.ts.
export const MEDIA_PLATFORMS = new Set(['Instagram', 'TikTok', 'Pinterest', 'YouTube']);

export function hasMedia(row: Pick<ReviewRow, 'media_urls'>): boolean {
  return Array.isArray(row.media_urls) && row.media_urls.some(u => typeof u === 'string' && u.trim().length > 0);
}

// A video brief is a script and shot list for Didi to film herself. No agent can
// produce it, so it never counts as "Cowork can create this".
export function isFilmingBrief(row: Pick<ReviewRow, 'asset_type' | 'creation_tool'>): boolean {
  return row.asset_type === 'video' && /video-brief|didi films/i.test(row.creation_tool ?? '');
}

export function needsMediaStill(row: ReviewRow): boolean {
  return MEDIA_PLATFORMS.has(row.platform) && !hasMedia(row);
}

export function classify(row: ReviewRow): Bucket {
  if (row.status === 'pushed')   return 'scheduled';
  if (row.status === 'failed')   return 'failed';
  if (row.status === 'rejected') return 'rejected';
  if (row.status === 'approved') return 'approved';

  // Approved but parked for media, or a draft that cannot publish without media.
  if (row.status === 'approved_needs_media' || needsMediaStill(row)) {
    // A blocked row always shows as blocked: the fix matters more than the media.
    if (row.gate_verdict === 'blocked') return 'blocked';
    if (isFilmingBrief(row)) return 'filming';
    return 'needs_media';
  }

  if (row.gate_verdict === 'blocked') return 'blocked';
  if (row.gate_verdict === 'flagged') return 'flagged';
  if (row.gate_verdict === 'ready')   return 'ready';
  return 'unchecked';
}

// Sort order for a week: Monday first, Saturday last, then by platform.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PLATFORMS = ['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Pinterest', 'YouTube'];

export function compareRows(a: ReviewRow, b: ReviewRow): number {
  const d = (DAYS.indexOf(a.day_name) + 1 || 99) - (DAYS.indexOf(b.day_name) + 1 || 99);
  if (d !== 0) return d;
  return (PLATFORMS.indexOf(a.platform) + 1 || 99) - (PLATFORMS.indexOf(b.platform) + 1 || 99);
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  scheduled:   'Scheduled',
  failed:      'Failed to publish',
  rejected:    'Rejected',
  approved:    'Approved',
  filming:     'Needs filming',
  needs_media: 'Needs media',
  blocked:     'Blocked',
  flagged:     'Flagged',
  ready:       'Ready',
  unchecked:   'Not yet checked',
};

export function summarise(rows: ReviewRow[]): Record<Bucket, number> {
  const out = {
    scheduled: 0, failed: 0, rejected: 0, approved: 0, filming: 0, needs_media: 0,
    blocked: 0, flagged: 0, ready: 0, unchecked: 0,
  } as Record<Bucket, number>;
  for (const r of rows) out[classify(r)]++;
  return out;
}
