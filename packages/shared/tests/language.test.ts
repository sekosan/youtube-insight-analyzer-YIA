import { describe, expect, it } from 'vitest';
import { detectLanguage } from '../src/language';

describe('detectLanguage', () => {
  it('detects english text reliably', () => {
    const sample = `This is a simple example transcript containing multiple sentences to ensure language detection works properly.`;
    const result = detectLanguage(sample);
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('falls back to default for short text', () => {
    const result = detectLanguage('Hi');
    expect(result.language).toBe('en');
  });
});
