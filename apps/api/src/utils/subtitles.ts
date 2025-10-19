import { TranscriptSegment } from '@yia/shared';

const timeToSeconds = (timestamp: string) => {
  const [h, m, rest] = timestamp.split(':');
  const [s, ms] = rest.split(',');
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms ?? 0) / 1000;
};

export const parseSrt = (content: string): TranscriptSegment[] => {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, index) => {
    const lines = block.split('\n');
    const timeLine = lines[1] ?? '';
    const [start, end] = timeLine.split(' --> ').map((value) => value.trim());
    const text = lines.slice(2).join(' ').trim();
    return {
      id: `${index}`,
      text,
      start: start ? timeToSeconds(start) : index * 4,
      end: end ? timeToSeconds(end) : index * 4 + 3
    };
  });
};

export const parseVtt = (content: string): TranscriptSegment[] => {
  const cleaned = content.replace(/^WEBVTT\s*/i, '');
  return parseSrt(cleaned);
};

export const transcriptFromPlainText = (content: string): TranscriptSegment[] =>
  content
    .split(/\n+/)
    .map((line, index) => ({
      id: `${index}`,
      text: line.trim(),
      start: index * 5,
      end: index * 5 + 4
    }))
    .filter((segment) => segment.text.length > 0);
