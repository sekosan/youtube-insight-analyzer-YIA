import {
  KeywordResponse,
  MindMapNode,
  QAResult,
  SummaryLength,
  SummaryResponse,
  TemplateKind,
  TemplateOutput,
  TranscriptSegment,
  chunkTranscript,
  selectRelevantChunks,
  SentimentTimeline
} from '@yia/shared';
import { AnalyzeInput, AIProvider } from './types';

type WordStats = {
  term: string;
  count: number;
};

const positiveWords = new Set(['good', 'great', 'excellent', 'positive', 'benefit', 'improve']);
const negativeWords = new Set(['bad', 'poor', 'negative', 'risk', 'issue', 'problem']);

const toSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const normalized = text.toLowerCase();
  let score = 0;
  positiveWords.forEach((word) => {
    if (normalized.includes(word)) score += 1;
  });
  negativeWords.forEach((word) => {
    if (normalized.includes(word)) score -= 1;
  });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
};

const buildSummary = (segments: TranscriptSegment[], length: SummaryLength): string => {
  const text = segments.map((segment) => segment.text).join(' ');
  const limit = length === 'short' ? 3 : length === 'medium' ? 6 : 10;
  const sentences = text.split(/[.!?]/).map((sentence) => sentence.trim()).filter(Boolean);
  return sentences.slice(0, limit).map((sentence) => `• ${sentence}`).join('\n');
};

const buildChapters = (segments: TranscriptSegment[]) => {
  const total = segments.length;
  const sliceSize = Math.max(1, Math.floor(total / 4));
  const chapters = [] as SummaryResponse['chapters'];
  for (let i = 0; i < total; i += sliceSize) {
    const chunk = segments.slice(i, i + sliceSize);
    const text = chunk.map((segment) => segment.text).join(' ');
    chapters.push({
      title: text.split(' ').slice(0, 6).join(' ') || `Chapter ${chapters.length + 1}`,
      start: chunk[0]?.start ?? 0,
      end: chunk[chunk.length - 1]?.end ?? chunk[0]?.start ?? 0,
      description: text.slice(0, 180)
    });
  }
  return chapters;
};

const computeKeywords = (segments: TranscriptSegment[]): KeywordResponse => {
  const text = segments.map((segment) => segment.text.toLowerCase()).join(' ');
  const tokens = text
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);
  const stats = new Map<string, WordStats>();
  tokens.forEach((token) => {
    const entry = stats.get(token) ?? { term: token, count: 0 };
    entry.count += 1;
    stats.set(token, entry);
  });
  const topics = Array.from(stats.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map(({ term, count }) => ({
      term,
      weight: count,
      sentiment: toSentiment(term)
    }));

  return {
    topics,
    seoTags: topics.slice(0, 6).map((topic) => topic.term),
    overallTone: toSentiment(text)
  };
};

const buildMindMapNode = (label: string, children: MindMapNode[] = []): MindMapNode => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
  label,
  children
});

const buildMindMap = (segments: TranscriptSegment[]): MindMapNode => {
  const chunks = chunkTranscript(segments, 800);
  const rootChildren = chunks.map((chunk, index) => ({
    id: `chunk-${index}`,
    label: chunk.text.split(' ').slice(0, 6).join(' ') || `Section ${index + 1}`,
    start: chunk.start,
    end: chunk.end,
    children: []
  }));
  return buildMindMapNode('Video Overview', rootChildren);
};

const answerFromChunks = (
  segments: TranscriptSegment[],
  chunks = chunkTranscript(segments, 1000),
  question: string
): QAResult => {
  const relevant = selectRelevantChunks(chunks, question, 3);
  const answer = relevant.map((chunk) => chunk.text).join('\n');
  const sources = relevant.flatMap((chunk) =>
    segments.filter((segment) => chunk.segmentIds.includes(segment.id))
  );
  return {
    question,
    answer: answer || 'No answer found in transcript.',
    sources
  };
};

const buildTemplate = (segments: TranscriptSegment[], kind: TemplateKind): TemplateOutput => {
  const text = segments.map((segment) => segment.text).join(' ');
  switch (kind) {
    case 'recipe':
      return {
        kind,
        summary: 'Auto-generated cooking summary',
        content: {
          ingredients: Array.from(new Set(text.match(/\b[a-z]+\b/gi) ?? [])).slice(0, 10),
          steps: text.split(/[.!?]/).filter(Boolean).slice(0, 6)
        }
      };
    case 'education':
      return {
        kind,
        summary: 'Education recap',
        content: {
          flashcards: segments.slice(0, 5).map((segment) => ({
            question: `Explain: ${segment.text.slice(0, 50)}`,
            answer: segment.text
          })),
          quiz: segments.slice(0, 5).map((segment, index) => ({
            question: `What is the key idea in part ${index + 1}?`,
            answer: segment.text
          }))
        }
      };
    case 'meeting':
    default:
      return {
        kind: 'meeting',
        summary: 'Meeting highlights',
        content: {
          decisions: segments.slice(0, 5).map((segment) => segment.text),
          actions: segments.slice(5, 10).map((segment) => segment.text)
        }
      };
  }
};

export class LocalProvider implements AIProvider {
  async summarize(input: AnalyzeInput, length: SummaryLength): Promise<SummaryResponse> {
    const { segments } = input;
    return {
      short: buildSummary(segments, 'short'),
      medium: buildSummary(segments, 'medium'),
      detailed: buildSummary(segments, 'detailed'),
      chapters: buildChapters(segments)
    };
  }

  async extractMindMap(input: AnalyzeInput): Promise<MindMapNode> {
    return buildMindMap(input.segments);
  }

  async extractKeywords(input: AnalyzeInput): Promise<KeywordResponse> {
    return computeKeywords(input.segments);
  }

  async qa(input: AnalyzeInput, question: string): Promise<QAResult> {
    return answerFromChunks(input.segments, chunkTranscript(input.segments, 800), question);
  }

  async templates(input: AnalyzeInput, kind: TemplateKind): Promise<TemplateOutput> {
    return buildTemplate(input.segments, kind);
  }

  async sentimentTimeline(input: AnalyzeInput): Promise<SentimentTimeline> {
    const chunks = chunkTranscript(input.segments, 600);
    const points = chunks.map((chunk) => {
      const sentiment = toSentiment(chunk.text);
      const score = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0;
      return {
        time: chunk.start,
        score,
        label: sentiment
      };
    });
    const averageScore =
      points.reduce((acc, point) => acc + point.score, 0) / (points.length || 1);
    return {
      averageScore,
      points
    };
  }
}
