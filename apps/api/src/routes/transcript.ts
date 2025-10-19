import { Router } from 'express';
import multer from 'multer';
import {
  TranscriptUploadSchema,
  TranscriptDocument,
  normalizeSegments,
  detectLanguage,
  LanguageDetection
} from '@yia/shared';
import { createError } from '../utils/error-handler';
import { parseSrt, parseVtt, transcriptFromPlainText } from '../utils/subtitles';
import { saveTranscript, getTranscript } from '../services/transcript-store';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export const transcriptRouter = Router();

const resolveLanguage = (
  requested: string | undefined,
  segments: ReturnType<typeof normalizeSegments>
): { language: string; detection: LanguageDetection } => {
  const detection = detectLanguage(segments);
  if (requested && requested !== 'auto') {
    return { language: requested, detection };
  }
  return { language: detection.language, detection };
};

transcriptRouter.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    const { videoId, language } = req.body as { videoId: string; language?: string };
    if (!videoId) {
      throw createError({ status: 400, code: 'invalid_request', message: 'Missing videoId' });
    }

    let segments;
    if (req.file) {
      const content = req.file.buffer.toString('utf-8');
      if (req.file.originalname.endsWith('.srt')) {
        segments = parseSrt(content);
      } else if (req.file.originalname.endsWith('.vtt')) {
        segments = parseVtt(content);
      } else {
        throw createError({ status: 400, code: 'unsupported_format', message: 'Only SRT or VTT supported' });
      }
    } else if (req.body.transcript) {
      segments = transcriptFromPlainText(req.body.transcript);
    } else {
      throw createError({ status: 400, code: 'invalid_request', message: 'No transcript provided' });
    }

    const normalized = normalizeSegments(segments);
    const { language: resolvedLanguage, detection } = resolveLanguage(language, normalized);

    const document: TranscriptDocument = {
      videoId,
      language: resolvedLanguage,
      segments: normalized,
      source: 'uploaded'
    };

    saveTranscript(document);

    res.json({ success: true, document, detection });
  } catch (error) {
    next(error);
  }
});

transcriptRouter.post('/normalize', (req, res, next) => {
  try {
    const parsed = TranscriptUploadSchema.parse(req.body);
    const segments = transcriptFromPlainText(parsed.transcript);
    const normalized = normalizeSegments(segments);
    const { language, detection } = resolveLanguage(parsed.language, normalized);
    const document: TranscriptDocument = {
      videoId: parsed.videoId,
      language,
      segments: normalized,
      source: 'uploaded'
    };
    saveTranscript(document);
    res.json({ success: true, document, detection });
  } catch (error) {
    next(error);
  }
});

transcriptRouter.post('/detect', (req, res, next) => {
  try {
    const { transcript } = req.body as { transcript?: string };
    if (!transcript) {
      throw createError({ status: 400, code: 'invalid_request', message: 'Transcript required' });
    }
    const detection = detectLanguage(transcript);
    res.json(detection);
  } catch (error) {
    next(error);
  }
});

transcriptRouter.get('/:videoId/:language', (req, res) => {
  const document = getTranscript(req.params.videoId, req.params.language);
  if (!document) {
    res.status(404).json({ code: 'not_found', message: 'Transcript not found' });
    return;
  }
  res.json(document);
});
