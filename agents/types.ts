// ── Shared types for the multiagent pipeline ─────────────────────────────────

export interface CoordinatorData {
  weeklyTheme: string;
  weekCommencing: string;
  campaignObjective?: string;
  setAt: string;
}

export interface SiteBrief {
  siteId: string;
  angle: string;
  keyPoints: string[];
  cta: string;
  platformNotes: string;
}

export interface Draft {
  siteId: string;
  platform: string;
  content: string;
  generatedAt: string;
}

export interface GraderResult {
  siteId: string;
  rubricName: string;
  verdict: 'pass' | 'fail';
  retryCount: number;
  failedCriterion: string | null;
  draft: Draft;
}

export interface SubagentStatusFile {
  lastRun: string;
  status: 'complete' | 'error' | 'idle';
  briefGenerated: boolean;
  briefSummary: string | null;
}

export interface GraderVerdictFile {
  rubricName: string;
  verdict: 'pass' | 'fail' | 'retry' | 'never_run';
  retryCount: number;
  failedCriterion: string | null;
  lastRun: string | null;
}

export interface ReviewItem {
  siteId: string;
  platform: string;
  graderVerdict: 'pass' | 'fail' | 'retry';
  retryCount: number;
  failedCriterion: string | null;
  contentSnippet: string | null;
  fullContent: string;
  generatedAt: string;
}

export interface ReviewQueueFile {
  generatedAt: string;
  drafts: ReviewItem[];
}

export interface DreamingStatusFile {
  lastRun: string | null;
  nextRun: string | null;
  mode: 'auto-update' | 'review-before-landing' | null;
  memoryUpdates: number;
  patternsExtracted: string[];
}

export interface PipelineSession {
  runAt: string;
  weeklyTheme: string;
  briefs: SiteBrief[];
  drafts: Draft[];
  graderResults: GraderResult[];
  approved: number;
  failed: number;
}
