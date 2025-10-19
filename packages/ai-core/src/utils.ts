export const safeJsonParse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return fallback;
  }
};

export const buildPromptTranscript = (transcript: string, maxChars = 6000): string => {
  if (transcript.length <= maxChars) {
    return transcript;
  }
  return `${transcript.slice(0, maxChars)}...`;
};

export const combineChunks = (transcript: string, maxChars = 6000) => {
  if (transcript.length <= maxChars) return transcript;
  const segments = transcript.split(/\n+/);
  const buffer: string[] = [];
  let total = 0;
  for (const segment of segments) {
    if (total + segment.length > maxChars) break;
    buffer.push(segment);
    total += segment.length;
  }
  return buffer.join('\n');
};

export const toSummaryResponse = (payload: any) => ({
  short: payload.short ?? '',
  medium: payload.medium ?? payload.short ?? '',
  detailed: payload.detailed ?? payload.medium ?? '',
  chapters: payload.chapters ?? []
});
