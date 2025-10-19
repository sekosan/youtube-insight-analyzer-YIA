import OpenAI from 'openai';
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
import { safeJsonParse, toSummaryResponse, combineChunks } from './utils';

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = DEFAULT_MODEL;
  }

  private async runPrompt<T>(prompt: string, fallback: T): Promise<T> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    const output = response.output_text ?? '';
    return safeJsonParse(output, fallback);
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
