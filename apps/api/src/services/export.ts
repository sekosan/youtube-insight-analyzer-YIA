import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import {
  ExportFormat,
  KeywordResponse,
  SentimentTimeline,
  SummaryResponse,
  TranscriptDocument
} from '@yia/shared';

const EXPORT_TTL = 1000 * 60 * 10; // 10 minutes
const SEGMENT_LIMIT = 500;
const PDF_SEGMENT_LIMIT = 40;

type ExportEntry = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  expiresAt: number;
};

type ExportRequest = {
  document: TranscriptDocument;
  format: ExportFormat;
  summary: SummaryResponse;
  keywords: KeywordResponse;
  sentiment?: SentimentTimeline;
};

type ExportResponse = {
  url: string;
  expiresAt: string;
  format: ExportFormat;
};

const store = new Map<string, ExportEntry>();

const formatTime = (value: number) => {
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const buildMarkdown = ({ document, summary, keywords, sentiment }: ExportRequest): Buffer => {
  const lines = [
    '# YouTube Insight Analyzer Export',
    `- Video ID: ${document.videoId}`,
    `- Language: ${document.language}`,
    '',
    '## Summary',
    '### Short',
    summary.short,
    '',
    '### Medium',
    summary.medium,
    '',
    '### Detailed',
    summary.detailed,
    '',
    '## Chapters'
  ];

  summary.chapters.forEach((chapter, index) => {
    lines.push(`- [${index + 1}] ${chapter.title} (${formatTime(chapter.start)} - ${formatTime(chapter.end)})`);
    if (chapter.description) {
      lines.push(`  - ${chapter.description}`);
    }
  });

  lines.push('', '## Keywords');
  keywords.topics.forEach((topic) => {
    lines.push(`- ${topic.term} (weight: ${topic.weight}${topic.sentiment ? `, ${topic.sentiment}` : ''})`);
  });

  if (sentiment) {
    lines.push('', '## Sentiment Overview');
    lines.push(`Average score: ${sentiment.averageScore.toFixed(2)}`);
    sentiment.points.forEach((point) => {
      lines.push(`- ${formatTime(point.time)} → ${point.label} (${point.score})`);
    });
  }

  const limitedSegments = document.segments.slice(0, SEGMENT_LIMIT);
  lines.push('', '## Transcript Highlights');
  lines.push('| Start | End | Text |');
  lines.push('| --- | --- | --- |');
  limitedSegments.forEach((segment) => {
    const text = segment.text.replace(/\|/g, '\\|');
    lines.push(`| ${formatTime(segment.start)} | ${formatTime(segment.end)} | ${text} |`);
  });

  if (document.segments.length > SEGMENT_LIMIT) {
    lines.push('', `> Transcript truncated to first ${SEGMENT_LIMIT} segments.`);
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
};

const buildCsv = ({ document }: ExportRequest): Buffer => {
  const rows = ['start,end,text'];
  document.segments.slice(0, SEGMENT_LIMIT).forEach((segment) => {
    const text = segment.text.replace(/"/g, '""');
    rows.push(`${segment.start.toFixed(2)},${segment.end.toFixed(2)},"${text}"`);
  });
  if (document.segments.length > SEGMENT_LIMIT) {
    rows.push(`# truncated to ${SEGMENT_LIMIT} segments`);
  }
  return Buffer.from(rows.join('\n'), 'utf-8');
};

const buildPdf = ({ document, summary, keywords, sentiment }: ExportRequest): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));

    doc.fontSize(20).text('YouTube Insight Analyzer Export', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Video ID: ${document.videoId}`);
    doc.text(`Language: ${document.language}`);
    doc.moveDown();

    doc.fontSize(14).text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(12).text('Short');
    doc.fontSize(11).text(summary.short, { paragraphGap: 8 });
    doc.fontSize(12).text('Medium');
    doc.fontSize(11).text(summary.medium, { paragraphGap: 8 });
    doc.fontSize(12).text('Detailed');
    doc.fontSize(11).text(summary.detailed, { paragraphGap: 12 });

    doc.fontSize(12).text('Chapters', { underline: true });
    summary.chapters.forEach((chapter, index) => {
      doc.fontSize(11).text(
        `${index + 1}. ${chapter.title} (${formatTime(chapter.start)} - ${formatTime(chapter.end)})`
      );
      if (chapter.description) {
        doc.fontSize(10).text(chapter.description, { indent: 12, paragraphGap: 6 });
      } else {
        doc.moveDown(0.3);
      }
    });

    doc.addPage();
    doc.fontSize(14).text('Keywords');
    keywords.topics.forEach((topic) => {
      doc.fontSize(11).text(
        `- ${topic.term} (weight: ${topic.weight}${topic.sentiment ? `, ${topic.sentiment}` : ''})`
      );
    });

    if (sentiment) {
      doc.moveDown();
      doc.fontSize(14).text('Sentiment Timeline');
      doc.fontSize(11).text(`Average score: ${sentiment.averageScore.toFixed(2)}`);
      sentiment.points.forEach((point) => {
        doc.fontSize(11).text(`${formatTime(point.time)} → ${point.label} (${point.score})`);
      });
    }

    doc.addPage();
    doc.fontSize(14).text('Transcript Highlights');
    document.segments.slice(0, PDF_SEGMENT_LIMIT).forEach((segment, index) => {
      doc.fontSize(11).text(
        `${index + 1}. [${formatTime(segment.start)} - ${formatTime(segment.end)}] ${segment.text}`,
        {
          paragraphGap: 6
        }
      );
    });

    if (document.segments.length > PDF_SEGMENT_LIMIT) {
      doc.moveDown();
      doc.fontSize(10).text(`Transcript truncated to first ${PDF_SEGMENT_LIMIT} segments.`);
    }

    doc.end();
  });
};

const buildExport = async (payload: ExportRequest): Promise<ExportEntry> => {
  switch (payload.format) {
    case 'markdown':
      return {
        buffer: buildMarkdown(payload),
        mimeType: 'text/markdown',
        filename: `yia-${payload.document.videoId}.md`,
        expiresAt: Date.now() + EXPORT_TTL
      };
    case 'csv':
      return {
        buffer: buildCsv(payload),
        mimeType: 'text/csv',
        filename: `yia-${payload.document.videoId}.csv`,
        expiresAt: Date.now() + EXPORT_TTL
      };
    case 'pdf':
    default:
      return {
        buffer: await buildPdf(payload),
        mimeType: 'application/pdf',
        filename: `yia-${payload.document.videoId}.pdf`,
        expiresAt: Date.now() + EXPORT_TTL
      };
  }
};

export const createExportPackage = async (payload: ExportRequest): Promise<ExportResponse> => {
  const { format } = payload;
  const entry = await buildExport(payload);
  const token = randomUUID();
  store.set(token, entry);
  return {
    format,
    url: `/api/analyze/export/${token}`,
    expiresAt: new Date(entry.expiresAt).toISOString()
  };
};

export const consumeExport = async (token: string): Promise<ExportEntry | null> => {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return {
    buffer: entry.buffer,
    mimeType: entry.mimeType,
    filename: entry.filename,
    expiresAt: entry.expiresAt
  };
};
