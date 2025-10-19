import { describe, expect, it } from 'vitest';
import { chunkTranscript, selectRelevantChunks, normalizeSegments } from '../src/transcript';

const buildSegments = () =>
  Array.from({ length: 10 }).map((_, index) => ({
    id: `${index}`,
    text: `Segment ${index} about topic ${index % 3}`,
    start: index * 10,
    end: index * 10 + 5
  }));

describe('chunkTranscript', () => {
  it('splits transcript into chunks respecting size', () => {
    const segments = buildSegments();
    const chunks = chunkTranscript(segments, 60);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(120);
    });
  });
});

describe('selectRelevantChunks', () => {
  it('prioritizes chunks with matching keywords', () => {
    const segments = buildSegments();
    const chunks = chunkTranscript(segments, 80);
    const relevant = selectRelevantChunks(chunks, 'topic 1');
    expect(relevant.length).toBeGreaterThan(0);
  });
});

describe('normalizeSegments', () => {
  it('orders segments and fills missing ids', () => {
    const segments = [
      { id: '', text: 'b', start: 5, end: 6 },
      { id: 'x', text: 'a', start: 1, end: 2 }
    ];
    const normalized = normalizeSegments(segments);
    expect(normalized[0].id).toBe('x');
    expect(normalized[1].id).toBe('1');
  });
});
