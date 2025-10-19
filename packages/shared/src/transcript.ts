import { TranscriptDocument, TranscriptSegment } from './types';

export type TranscriptChunk = {
  text: string;
  start: number;
  end: number;
  segmentIds: string[];
};

const DEFAULT_CHUNK_SIZE = 1200;

export const chunkTranscript = (
  segments: TranscriptSegment[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
): TranscriptChunk[] => {
  const chunks: TranscriptChunk[] = [];
  let buffer = '';
  let start = segments[0]?.start ?? 0;
  let segmentIds: string[] = [];

  segments.forEach((segment, index) => {
    const candidate = buffer.length ? `${buffer} ${segment.text}` : segment.text;
    if (candidate.length > chunkSize && buffer.length) {
      const end = segments[index - 1]?.end ?? segment.end;
      chunks.push({ text: buffer.trim(), start, end, segmentIds });
      buffer = segment.text;
      start = segment.start;
      segmentIds = [segment.id];
    } else {
      buffer = candidate;
      if (!segmentIds.length) {
        start = segment.start;
      }
      segmentIds.push(segment.id);
    }
  });

  if (buffer.trim().length) {
    const end = segments[segments.length - 1]?.end ?? start;
    chunks.push({ text: buffer.trim(), start, end, segmentIds });
  }

  return chunks;
};

export const transcriptToText = (document: TranscriptDocument): string =>
  document.segments
    .map((segment) => {
      const timestamp = new Date(segment.start * 1000).toISOString().substring(11, 19);
      const speaker = segment.speaker ? `${segment.speaker}: ` : '';
      return `[${timestamp}] ${speaker}${segment.text}`;
    })
    .join('\n');

export const selectRelevantChunks = (
  chunks: TranscriptChunk[],
  query: string,
  limit = 4
): TranscriptChunk[] => {
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const scored = chunks
    .map((chunk) => {
      const text = chunk.text.toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        if (!keyword.trim()) return acc;
        const occurrences = text.split(keyword).length - 1;
        return acc + occurrences * (keyword.length > 4 ? 2 : 1);
      }, 0);
      return { chunk, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ chunk }) => chunk);
};

export const normalizeSegments = (segments: TranscriptSegment[]): TranscriptSegment[] =>
  segments
    .sort((a, b) => a.start - b.start)
    .map((segment, index) => ({
      ...segment,
      id: segment.id || `${index}`
    }));
