import {
  SummaryLength,
  TranscriptDocument,
  SummaryResponse,
  MindMapNode,
  KeywordResponse,
  QAResult,
  SentimentTimeline,
  TemplateKind,
  TemplateOutput
} from '@yia/shared';
import {
  summarize,
  extractMindMap,
  extractKeywords,
  runQA,
  buildSentimentTimeline,
  buildTemplates
} from '@yia/ai-core';
import { getCache, setCache } from './cache';

const CACHE_TTL = 60 * 10; // 10 minutes

const buildKey = (
  document: TranscriptDocument,
  operation: string,
  runtime?: string
) => ({
  videoId: document.videoId,
  language: document.language,
  operation: runtime ? `${operation}:${runtime}` : operation
});

export const getSummary = async (
  document: TranscriptDocument,
  length: SummaryLength,
  runtime?: string
): Promise<SummaryResponse> => {
  const key = buildKey(document, `summary:${length}`, runtime);
  const cached = await getCache<SummaryResponse>(key);
  if (cached) return cached;
  const result = await summarize(document, length, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};

export const getMindMap = async (
  document: TranscriptDocument,
  runtime?: string
): Promise<MindMapNode> => {
  const key = buildKey(document, 'mindmap', runtime);
  const cached = await getCache<MindMapNode>(key);
  if (cached) return cached;
  const result = await extractMindMap(document, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};

export const getKeywords = async (
  document: TranscriptDocument,
  runtime?: string
): Promise<KeywordResponse> => {
  const key = buildKey(document, 'keywords', runtime);
  const cached = await getCache<KeywordResponse>(key);
  if (cached) return cached;
  const result = await extractKeywords(document, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};

export const getQA = async (
  document: TranscriptDocument,
  question: string,
  runtime?: string
): Promise<QAResult> => {
  const key = buildKey(document, `qa:${question}`, runtime);
  const cached = await getCache<QAResult>(key);
  if (cached) return cached;
  const result = await runQA(document, question, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};

export const getSentiment = async (
  document: TranscriptDocument,
  runtime?: string
): Promise<SentimentTimeline> => {
  const key = buildKey(document, 'sentiment', runtime);
  const cached = await getCache<SentimentTimeline>(key);
  if (cached) return cached;
  const result = await buildSentimentTimeline(document, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};

export const getTemplate = async (
  document: TranscriptDocument,
  kind: TemplateKind,
  runtime?: string
): Promise<TemplateOutput> => {
  const key = buildKey(document, `template:${kind}`, runtime);
  const cached = await getCache<TemplateOutput>(key);
  if (cached) return cached;
  const result = await buildTemplates(document, kind, runtime);
  await setCache(key, result, CACHE_TTL);
  return result;
};
