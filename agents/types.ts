// ── Shared types for the brand configuration ─────────────────────────────────

export interface ContentPillar {
  id:          string;
  name:        string;
  description: string;
}

export type ContentPillarsFile = Record<string, ContentPillar[]>;
