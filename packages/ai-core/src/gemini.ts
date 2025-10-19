import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  KeywordResponse,
  MindMapNode,
  QAResult,
  SummaryLength,
  SummaryResponse,
  TemplateKind,
  TemplateOutput,
  chunkTranscript,
  selectRelevantChunks
} from '@yia/shared';
import { AnalyzeInput, AIProvider } from './types';
import {
  buildKeywordPrompt,
  buildMindMapPrompt,
  buildQAPrompt,
  buildSummaryPrompt,
  buildTemplatePrompt
} from './prompts';
import { combineChunks, safeJsonParse, toSummaryResponse } from './utils';

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash-latest';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    this.modelName = DEFAULT_MODEL;
  }

  private async runPrompt<T>(prompt: string, fallback: T): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(prompt);
    const text = result.response?.text() ?? '';
    return safeJsonParse(text, fallback);
  }

  async summarize(input: AnalyzeInput, length: SummaryLength): Promise<SummaryResponse> {
    const prompt = buildSummaryPrompt({
      transcript: combineChunks(input.transcript),
      length,
      language: input.language
    });
    const payload = await this.runPrompt(prompt, {});
    return toSummaryResponse(payload);
  }

  async extractMindMap(input: AnalyzeInput): Promise<MindMapNode> {
    const prompt = buildMindMapPrompt({
      transcript: combineChunks(input.transcript),
      language: input.language
    });
    return this.runPrompt(prompt, {
      id: 'root',
      label: 'Video Overview',
      children: []
    });
  }

  async extractKeywords(input: AnalyzeInput): Promise<KeywordResponse> {
    const prompt = buildKeywordPrompt({
      transcript: combineChunks(input.transcript),
      language: input.language
    });
    return this.runPrompt(prompt, {
      topics: [],
      seoTags: [],
      overallTone: 'neutral'
    });
  }

  async qa(input: AnalyzeInput, question: string): Promise<QAResult> {
    const chunks = chunkTranscript(input.segments, 1200);
    const relevant = selectRelevantChunks(chunks, question, 4);
    const prompt = buildQAPrompt({
      transcript: relevant.map((chunk) => chunk.text).join('\n'),
      language: input.language,
      question
    });
    const payload = await this.runPrompt(prompt, { answer: '', citations: [] });
    return {
      question,
      answer: payload.answer ?? '',
      sources: relevant.flatMap((chunk) =>
        input.segments.filter((segment) => chunk.segmentIds.includes(segment.id))
      )
    };
  }

  async templates(input: AnalyzeInput, kind: TemplateKind): Promise<TemplateOutput> {
    const prompt = buildTemplatePrompt({
      transcript: combineChunks(input.transcript),
      language: input.language,
      kind
    });
    const payload = await this.runPrompt(prompt, { kind, summary: '', content: {} });
    return {
      kind,
      summary: payload.summary ?? '',
      content: payload.content ?? {}
    };
  }
}
