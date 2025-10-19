import {
  MindMapNode,
  QAResult,
  SummaryLength,
  SummaryResponse,
  KeywordResponse,
  TemplateKind,
  TemplateOutput,
  SentimentTimeline,
  TranscriptDocument,
  transcriptToText,
  normalizeSegments
} from '@yia/shared';
import { AnalyzeInput, AIProvider } from './types';
import { LocalProvider } from './local';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';

const getRuntime = () => (process.env.AI_RUNTIME_PROVIDER ?? 'local').toLowerCase();

const providerCache = new Map<string, AIProvider>();

const buildInput = (document: TranscriptDocument): AnalyzeInput => {
  const segments = normalizeSegments(document.segments);
  return {
    videoId: document.videoId,
    language: document.language,
    document,
    segments,
    transcript: transcriptToText({ ...document, segments })
  };
};

export const resolveProvider = (runtimeOverride?: string): AIProvider => {
  const runtime = (runtimeOverride ?? getRuntime()).toLowerCase();
  if (providerCache.has(runtime)) {
    return providerCache.get(runtime)!;
  }
  let provider: AIProvider;
  if (runtime === 'openai' && process.env.OPENAI_API_KEY) {
    provider = new OpenAIProvider();
  } else if (runtime === 'gemini' && process.env.GEMINI_API_KEY) {
    provider = new GeminiProvider();
  } else {
    provider = new LocalProvider();
  }
  providerCache.set(runtime, provider);
  return provider;
};

export const summarize = async (
  document: TranscriptDocument,
  length: SummaryLength,
  runtimeOverride?: string
): Promise<SummaryResponse> => {
  const provider = resolveProvider(runtimeOverride);
  return provider.summarize(buildInput(document), length);
};

export const extractMindMap = async (
  document: TranscriptDocument,
  runtimeOverride?: string
): Promise<MindMapNode> => {
  const provider = resolveProvider(runtimeOverride);
  return provider.extractMindMap(buildInput(document));
};

export const extractKeywords = async (
  document: TranscriptDocument,
  runtimeOverride?: string
): Promise<KeywordResponse> => {
  const provider = resolveProvider(runtimeOverride);
  return provider.extractKeywords(buildInput(document));
};

export const runQA = async (
  document: TranscriptDocument,
  question: string,
  runtimeOverride?: string
): Promise<QAResult> => {
  const provider = resolveProvider(runtimeOverride);
  return provider.qa(buildInput(document), question);
};

export const buildTemplates = async (
  document: TranscriptDocument,
  kind: TemplateKind,
  runtimeOverride?: string
): Promise<TemplateOutput> => {
  const provider = resolveProvider(runtimeOverride);
  if (!provider.templates) {
    throw new Error('Templates not implemented for current provider');
  }
  return provider.templates(buildInput(document), kind);
};

export const buildSentimentTimeline = async (
  document: TranscriptDocument,
  runtimeOverride?: string
): Promise<SentimentTimeline> => {
  const provider = resolveProvider(runtimeOverride);
  if (!provider.sentimentTimeline) {
    throw new Error('Sentiment timeline not implemented for current provider');
  }
  return provider.sentimentTimeline(buildInput(document));
};
