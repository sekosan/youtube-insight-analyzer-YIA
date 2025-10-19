import {
  HeatmapPoint,
  KeywordResponse,
  MindMapNode,
  QAResult,
  SentimentTimeline,
  SummaryLength,
  SummaryResponse,
  TemplateKind,
  TemplateOutput,
  TranscriptDocument,
  TranscriptSegment
} from '@yia/shared';

export type AnalyzeInput = {
  transcript: string;
  segments: TranscriptSegment[];
  document: TranscriptDocument;
  language: string;
  videoId: string;
};

export interface AIProvider {
  summarize(input: AnalyzeInput, length: SummaryLength): Promise<SummaryResponse>;
  extractMindMap(input: AnalyzeInput): Promise<MindMapNode>;
  extractKeywords(input: AnalyzeInput): Promise<KeywordResponse>;
  qa(input: AnalyzeInput, question: string): Promise<QAResult>;
  sentimentTimeline?(input: AnalyzeInput): Promise<SentimentTimeline>;
  heatmap?(input: AnalyzeInput): Promise<HeatmapPoint[]>;
  templates?(input: AnalyzeInput, kind: TemplateKind): Promise<TemplateOutput>;
}
