export type TranscriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
};

export type TranscriptDocument = {
  videoId: string;
  language: string;
  segments: TranscriptSegment[];
  source: 'uploaded' | 'youtube';
};

export type SummaryLength = 'short' | 'medium' | 'detailed';

export type Chapter = {
  title: string;
  start: number;
  end: number;
  description?: string;
};

export type SummaryResponse = {
  short: string;
  medium: string;
  detailed: string;
  chapters: Chapter[];
};

export type MindMapNode = {
  id: string;
  label: string;
  start?: number;
  end?: number;
  children?: MindMapNode[];
};

export type KeywordEntry = {
  term: string;
  weight: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  tags?: string[];
};

export type KeywordResponse = {
  topics: KeywordEntry[];
  seoTags: string[];
  overallTone: 'positive' | 'neutral' | 'negative';
};

export type QAResult = {
  question: string;
  answer: string;
  sources: TranscriptSegment[];
};

export type SentimentPoint = {
  time: number;
  score: number;
  label: 'positive' | 'neutral' | 'negative';
};

export type SentimentTimeline = {
  averageScore: number;
  points: SentimentPoint[];
};

export type HeatmapPoint = {
  time: number;
  intensity: number;
  label?: string;
};

export type TemplateKind = 'recipe' | 'education' | 'meeting';

export type TemplateOutput = {
  kind: TemplateKind;
  content: Record<string, unknown>;
  summary: string;
};

export type ExportFormat = 'markdown' | 'pdf' | 'csv';

export type Paginated<T> = {
  items: T[];
  total: number;
};

export type CacheKey = {
  videoId: string;
  language: string;
  operation: string;
};

export type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};
