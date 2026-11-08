// ── Google Drive public-URL bridge ──────────────────────────────────────────
// Blotato's push takes a raw, publicly fetchable file URL in content.mediaUrls
// — a Drive "share" link isn't that. This constructs Drive's direct-download
// URL format from a file id, which works once the file is shared as "anyone
// with the link". See the Phase 1 scope doc's "Open decisions" for the accepted
// trade-off: Google can rate-limit or challenge automated fetches on this route,
// especially for large files. If Blotato pushes start failing on video
// specifically, the documented fallback is mirroring finished assets into
// Supabase Storage instead of debugging Drive's fetch behaviour indefinitely.

export function driveDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}
