import { Router } from 'express';
import {
  SummaryRequestSchema,
  MindMapRequestSchema,
  KeywordRequestSchema,
  QARequestSchema,
  SentimentRequestSchema,
  TemplateRequestSchema,
  ExportRequestSchema,
  TranscriptDocument,
  normalizeSegments,
  detectLanguage
} from '@yia/shared';
import { getSummary, getMindMap, getKeywords, getQA, getSentiment, getTemplate } from '../services/ai';
import { transcriptFromPlainText } from '../utils/subtitles';
import { getTranscript, saveTranscript } from '../services/transcript-store';
import { createExportPackage, consumeExport } from '../services/export';
import { createError } from '../utils/error-handler';

const resolveDocument = (payload: any): TranscriptDocument => {
  const { videoId, language, transcript } = payload as {
    videoId: string;
    language: string;
    transcript?: string;
  };
  if (language && language !== 'auto') {
    const stored = getTranscript(videoId, language);
    if (stored) return stored;
  }
  if (!transcript) {
    throw new Error('Transcript required');
  }
  const segments = normalizeSegments(transcriptFromPlainText(transcript));
  const detection = detectLanguage(segments);
  const resolvedLanguage = language === 'auto' ? detection.language : language;
  const document: TranscriptDocument = {
    videoId,
    language: resolvedLanguage,
    segments,
    source: 'uploaded'
  };
  if (!language || language === 'auto') {
    saveTranscript(document);
  }
  return document;
};

export const analyzeRouter = Router();

analyzeRouter.post('/summary', async (req, res, next) => {
  try {
    const parsed = SummaryRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const summary = await getSummary(document, parsed.length, runtime);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/sentiment', async (req, res, next) => {
  try {
    const parsed = SentimentRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const sentiment = await getSentiment(document, runtime);
    res.json(sentiment);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/templates', async (req, res, next) => {
  try {
    const parsed = TemplateRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const template = await getTemplate(document, parsed.kind, runtime);
    res.json(template);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/export', async (req, res, next) => {
  try {
    const parsed = ExportRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const [summary, keywords, sentiment] = await Promise.all([
      getSummary(document, 'detailed', runtime),
      getKeywords(document, runtime),
      getSentiment(document, runtime).catch(() => null)
    ]);
    const exportInfo = await createExportPackage({
      document,
      format: parsed.format,
      summary,
      keywords,
      sentiment: sentiment ?? undefined
    });
    res.json(exportInfo);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.get('/export/:token', async (req, res, next) => {
  try {
    const entry = await consumeExport(req.params.token);
    if (!entry) {
      throw createError({ status: 404, code: 'export_not_found', message: 'Export expired or missing' });
    }
    res.setHeader('Content-Type', entry.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${entry.filename}"`);
    res.send(entry.buffer);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/mindmap', async (req, res, next) => {
  try {
    const parsed = MindMapRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const mindMap = await getMindMap(document, runtime);
    res.json(mindMap);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/keywords', async (req, res, next) => {
  try {
    const parsed = KeywordRequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const keywords = await getKeywords(document, runtime);
    res.json(keywords);
  } catch (error) {
    next(error);
  }
});

analyzeRouter.post('/qa', async (req, res, next) => {
  try {
    const parsed = QARequestSchema.parse(req.body);
    const document = resolveDocument(parsed);
    const runtime = (req.headers['x-ai-provider'] as string | undefined)?.toLowerCase();
    const answer = await getQA(document, parsed.question, runtime);
    res.json(answer);
  } catch (error) {
    next(error);
  }
});
