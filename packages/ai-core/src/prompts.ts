import { SummaryLength, TemplateKind } from '@yia/shared';

type SummaryPromptParams = {
  transcript: string;
  length: SummaryLength;
  language: string;
};

export const buildSummaryPrompt = ({ transcript, length, language }: SummaryPromptParams) => `
You are an expert video analyst generating structured insights strictly from transcript text.
Provide a ${length} summary in ${language} with concise bullet points and craft auto chapters.
Respond as JSON with keys short, medium, detailed, chapters (array of {title,start,end,description}).
Transcript:
"""
${transcript}
"""
`;

type MindMapPromptParams = {
  transcript: string;
  language: string;
};

export const buildMindMapPrompt = ({ transcript, language }: MindMapPromptParams) => `
Analyse the transcript and build a hierarchical mind map in ${language}.
Return JSON { id, label, children: [{ id, label, start, end, children }] } with timestamps in seconds.
Focus on actionable structure.
Transcript:
"""
${transcript}
"""
`;

type KeywordPromptParams = {
  transcript: string;
  language: string;
};

export const buildKeywordPrompt = ({ transcript, language }: KeywordPromptParams) => `
Extract critical keywords from the transcript in ${language}. Provide JSON with keys topics (array of {term,weight,sentiment,tags}), seoTags (array of strings), overallTone ('positive'|'neutral'|'negative').
Transcript:
"""
${transcript}
"""
`;

type QAPromptParams = {
  transcript: string;
  language: string;
  question: string;
};

export const buildQAPrompt = ({ transcript, language, question }: QAPromptParams) => `
Answer the question strictly using the transcript below in ${language}. Provide JSON {answer, citations:[{text,start,end}]}.
Question: ${question}
Transcript:
"""
${transcript}
"""
`;

type TemplatePromptParams = {
  transcript: string;
  language: string;
  kind: TemplateKind;
};

export const buildTemplatePrompt = ({ transcript, language, kind }: TemplatePromptParams) => `
Generate a ${kind} template in ${language} from the transcript.
Return JSON {kind, summary, content} where content is a structured object appropriate for ${kind}.
Transcript:
"""
${transcript}
"""
`;
