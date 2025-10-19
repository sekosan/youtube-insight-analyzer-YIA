import { TranscriptDocument } from '@yia/shared';

const store = new Map<string, { document: TranscriptDocument; expiresAt: number }>();
const TTL = 1000 * 60 * 60; // 1 hour

export const saveTranscript = (document: TranscriptDocument) => {
  const key = `${document.videoId}:${document.language}`;
  store.set(key, { document, expiresAt: Date.now() + TTL });
};

export const getTranscript = (videoId: string, language: string): TranscriptDocument | null => {
  const key = `${videoId}:${language}`;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.document;
};

export const deleteTranscript = (videoId: string, language: string) => {
  store.delete(`${videoId}:${language}`);
};
