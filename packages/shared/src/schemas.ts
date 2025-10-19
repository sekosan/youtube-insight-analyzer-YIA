import { z } from 'zod';

export const YouTubeUrlSchema = z.object({
  url: z
    .string()
    .url()
    .refine((val) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(val), {
      message: 'Invalid YouTube URL'
    })
});

export const VideoIdSchema = z.object({
  videoId: z
    .string()
    .regex(/^[\w-]{11}$/)
});

export const TranscriptUploadSchema = z.object({
  videoId: z.string(),
  language: z.string().min(2).max(8),
  transcript: z.string().min(10)
});

export const SummaryRequestSchema = z.object({
  videoId: z.string(),
  language: z.union([z.literal('auto'), z.string().min(2).max(8)]),
  transcript: z.string().min(10),
  length: z.enum(['short', 'medium', 'detailed']).default('medium')
});

export const MindMapRequestSchema = SummaryRequestSchema.pick({
  videoId: true,
  language: true,
  transcript: true
});

export const KeywordRequestSchema = SummaryRequestSchema.pick({
  videoId: true,
  language: true,
  transcript: true
});

export const QARequestSchema = z.object({
  videoId: z.string(),
  language: z.union([z.literal('auto'), z.string().min(2).max(8)]),
  transcript: z.string().min(10),
  question: z.string().min(3)
});

export const SentimentRequestSchema = SummaryRequestSchema.pick({
  videoId: true,
  language: true,
  transcript: true
});

export const TemplateRequestSchema = SummaryRequestSchema.pick({
  videoId: true,
  language: true,
  transcript: true
}).extend({
  kind: z.enum(['recipe', 'education', 'meeting'])
});

export const ExportRequestSchema = SummaryRequestSchema.pick({
  videoId: true,
  language: true,
  transcript: true
}).extend({
  format: z.enum(['markdown', 'pdf', 'csv'])
});

export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  speaker: z.string().optional()
});

export const TranscriptDocumentSchema = z.object({
  videoId: z.string(),
  language: z.string(),
  segments: z.array(TranscriptSegmentSchema),
  source: z.enum(['uploaded', 'youtube'])
});

export const CacheKeySchema = z.object({
  videoId: z.string(),
  language: z.string(),
  operation: z.string()
});
