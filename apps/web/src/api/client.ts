import axios from 'axios';
import {
  SummaryResponse,
  MindMapNode,
  KeywordResponse,
  QAResult,
  SummaryLength,
  SentimentTimeline,
  TemplateKind,
  TemplateOutput,
  ExportFormat,
  TranscriptDocument
} from '@yia/shared';

const api = axios.create({
  baseURL: '/api'
});

let runtimeProvider: 'local' | 'openai' | 'gemini' | undefined;

api.interceptors.request.use((config) => {
  if (runtimeProvider) {
    config.headers = config.headers ?? {};
    config.headers['x-ai-provider'] = runtimeProvider;
  }
  return config;
});

export const setRuntimeProvider = (provider: 'local' | 'openai' | 'gemini') => {
  runtimeProvider = provider;
};

export const validateUrl = async (url: string) => {
  const { data } = await api.post('/youtube/validate', { url });
  return data as { valid: boolean; videoId?: string; error?: string };
};

export const fetchMeta = async (videoId: string) => {
  const { data } = await api.get(`/youtube/meta/${videoId}`);
  return data as Record<string, unknown>;
};

export const uploadTranscript = async (
  payload: { videoId: string; language: string; transcript: string } | FormData
) => {
  if (payload instanceof FormData) {
    const { data } = await api.post('/transcript/upload', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data as { document: TranscriptDocument; detection?: { language: string } };
  }
  const { data } = await api.post('/transcript/normalize', payload);
  return data as { document: TranscriptDocument; detection?: { language: string } };
};

export const analyzeSummary = async (
  body: { videoId: string; language: string; transcript: string; length: SummaryLength }
) => {
  const { data } = await api.post('/analyze/summary', body);
  return data as SummaryResponse;
};

export const analyzeMindMap = async (body: { videoId: string; language: string; transcript: string }) => {
  const { data } = await api.post('/analyze/mindmap', body);
  return data as MindMapNode;
};

export const analyzeKeywords = async (body: { videoId: string; language: string; transcript: string }) => {
  const { data } = await api.post('/analyze/keywords', body);
  return data as KeywordResponse;
};

export const analyzeQA = async (
  body: { videoId: string; language: string; transcript: string; question: string }
) => {
  const { data } = await api.post('/analyze/qa', body);
  return data as QAResult;
};

export const analyzeSentiment = async (body: {
  videoId: string;
  language: string;
  transcript: string;
}) => {
  const { data } = await api.post('/analyze/sentiment', body);
  return data as SentimentTimeline;
};

export const requestTemplate = async (body: {
  videoId: string;
  language: string;
  transcript: string;
  kind: TemplateKind;
}) => {
  const { data } = await api.post('/analyze/templates', body);
  return data as TemplateOutput;
};

export const requestExport = async (body: {
  videoId: string;
  language: string;
  transcript: string;
  format: ExportFormat;
}) => {
  const { data } = await api.post('/analyze/export', body);
  return data as { url: string; expiresAt: string; format: ExportFormat };
};

export const detectTranscriptLanguage = async (transcript: string) => {
  const { data } = await api.post('/transcript/detect', { transcript });
  return data as { language: string; confidence: number; reliability: string };
};
