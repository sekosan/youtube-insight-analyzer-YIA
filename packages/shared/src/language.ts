import franc from 'franc-min';
import langs from 'langs';
import { TranscriptSegment } from './types';

export type LanguageDetection = {
  language: string;
  confidence: number;
  reliability: 'high' | 'medium' | 'low';
};

const DEFAULT_LANGUAGE: LanguageDetection = {
  language: 'en',
  confidence: 0,
  reliability: 'low'
};

const sanitize = (text: string) => text.replace(/\s+/g, ' ').trim();

const toDetection = (code: string, distance: number): LanguageDetection => {
  const lang = langs.where('3', code);
  const iso = lang?.['1'];
  const confidence = Math.max(0, 1 - distance);
  let reliability: LanguageDetection['reliability'];
  if (confidence >= 0.85) {
    reliability = 'high';
  } else if (confidence >= 0.6) {
    reliability = 'medium';
  } else {
    reliability = 'low';
  }
  return {
    language: iso ?? DEFAULT_LANGUAGE.language,
    confidence,
    reliability
  };
};

export const detectLanguage = (input: string | TranscriptSegment[]): LanguageDetection => {
  const text = Array.isArray(input)
    ? sanitize(input.map((segment) => segment.text).join(' '))
    : sanitize(input);

  if (!text || text.length < 20) {
    return DEFAULT_LANGUAGE;
  }

  const candidates = franc.all(text, { minLength: 20 }).filter(([code]) => code !== 'und');
  if (!candidates.length) {
    return DEFAULT_LANGUAGE;
  }

  const [code, distance] = candidates[0];
  return toDetection(code, distance);
};
