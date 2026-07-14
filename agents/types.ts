// ── Shared types for the multiagent pipeline ─────────────────────────────────

export interface SiteWeeklyPlan {
  pillarId:  string;
  theme:     string;
  notes?:    string;
}

export interface CoordinatorData {
  weekCommencing:    string;
  campaignObjective?: string;
  setAt:             string;
  sites:             Record<string, SiteWeeklyPlan>;
}

export interface SiteBrief {
  siteId:   string;
  dayName:  string; // 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  angle:    string;
  keyPoints: string[];
  cta:      string;
  platformNotes: string;
}

export interface Draft {
  siteId:      string;
  dayName:     string;
  platform:    string;
  content:     string;
  generatedAt: string;
}

export interface GraderResult {
  siteId:          string;
  dayName:         string;
  rubricName:      string;
  verdict:         'pass' | 'fail';
  retryCount:      number;
  failedCriterion: string | null;
  draft:           Draft;
}

export interface SubagentStatusFile {
  lastRun:        string;
  status:         'complete' | 'error' | 'idle';
  briefGenerated: boolean;
  briefSummary:   string | null;
}

export interface GraderVerdictFile {
  rubricName:      string;
  verdict:         'pass' | 'fail' | 'retry' | 'never_run';
  retryCount:      number;
  failedCriterion: string | null;
  lastRun:         string | null;
}

export interface ReviewItem {
  siteId:          string;
  dayName:         string;
  platform:        string;
  graderVerdict:   'pass' | 'fail' | 'retry';
  retryCount:      number;
  failedCriterion: string | null;
  contentSnippet:  string | null;
  fullContent:     string;
  generatedAt:     string;
}

export interface ReviewQueueFile {
  generatedAt: string;
  drafts:      ReviewItem[];
}

export interface PipelineSession {
  runAt:         string;
  weekCommencing: string;
  briefs:        SiteBrief[];
  drafts:        Draft[];
  graderResults: GraderResult[];
  approved:      number;
  failed:        number;
}

export interface ContentPillar {
  id:          string;
  name:        string;
  description: string;
}

export type ContentPillarsFile = Record<string, ContentPillar[]>;
