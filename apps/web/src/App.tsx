import { useEffect, useMemo, useState } from 'react';
import {
  validateUrl,
  fetchMeta,
  uploadTranscript,
  analyzeSummary,
  analyzeMindMap,
  analyzeKeywords,
  analyzeQA,
  analyzeSentiment,
  requestTemplate,
  requestExport,
  detectTranscriptLanguage,
  setRuntimeProvider
} from './api/client';
import {
  SummaryResponse,
  MindMapNode,
  KeywordResponse,
  QAResult,
  SummaryLength,
  TranscriptSegment,
  SentimentTimeline,
  TemplateKind,
  TemplateOutput,
  ExportFormat
} from '@yia/shared';
import { MindMap, ExportButtons } from '@yia/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const tabs = [
  'Summary',
  'Mind Map',
  'Transcript',
  'Q&A',
  'Sentiment',
  'Heatmap',
  'Templates',
  'Export'
] as const;

const languageField = z.union([z.literal('auto'), z.string().min(2).max(8)]);

const analysisSchema = z.object({
  url: z.string().url({ message: 'Provide a valid YouTube URL' }),
  language: languageField.default('auto'),
  transcript: z.string().min(10, 'Transcript required'),
  length: z.enum(['short', 'medium', 'detailed']).default('medium')
});

const templateKinds: TemplateKind[] = ['meeting', 'education', 'recipe'];
const languageOptions = ['auto', 'en', 'es', 'fr', 'de', 'pt', 'tr', 'hi', 'ja', 'zh'];

type AnalysisForm = z.infer<typeof analysisSchema>;

type ProviderOption = 'local' | 'openai' | 'gemini';

const qaDefault = 'What are the key takeaways?';

type ExportTicket = { format: ExportFormat; url: string; expiresAt: string };

const formatSeconds = (value: number) => {
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const TranscriptList = ({ segments }: { segments: TranscriptSegment[] }) => {
  if (!segments.length) {
    return <p className="text-sm text-slate-500">No transcript loaded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {segments.map((segment) => (
        <li key={segment.id} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">{formatSeconds(segment.start)} → {formatSeconds(segment.end)}</p>
          <p className="text-sm text-slate-800">{segment.text}</p>
        </li>
      ))}
    </ol>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Summary');
  const [provider, setProvider] = useState<ProviderOption>('local');
  const [videoId, setVideoId] = useState<string>('');
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);
  const [keywords, setKeywords] = useState<KeywordResponse | null>(null);
  const [qaHistory, setQaHistory] = useState<QAResult[]>([]);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState(qaDefault);
  const [error, setError] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<SentimentTimeline | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKind>('meeting');
  const [templateOutput, setTemplateOutput] = useState<TemplateOutput | null>(null);
  const [exportLinks, setExportLinks] = useState<ExportTicket[]>([]);
  const [languageDetection, setLanguageDetection] = useState<
    { language: string; confidence: number; reliability: string } | null
  >(null);
  const [resolvedLanguage, setResolvedLanguage] = useState<string>('en');
  const [detectingLanguage, setDetectingLanguage] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm<AnalysisForm>({
    resolver: zodResolver(analysisSchema),
    defaultValues: {
      url: '',
      language: 'auto',
      transcript: '',
      length: 'medium'
    }
  });

  useEffect(() => {
    setRuntimeProvider(provider);
  }, [provider]);

  const languageValue = watch('language');
  const transcriptValue = watch('transcript');

  const joinSegments = (items: TranscriptSegment[]) => items.map((segment) => segment.text).join('\n');

  const fallbackSegments = (text: string): TranscriptSegment[] =>
    text
      .split(/\n+/)
      .filter((line) => line.trim().length)
      .map((line, index) => ({
        id: `${index}`,
        text: line.trim(),
        start: index * 5,
        end: index * 5 + 4
      }));

  useEffect(() => {
    if (languageValue && languageValue !== 'auto') {
      setResolvedLanguage(languageValue);
      setLanguageDetection(null);
      return;
    }
    if (!transcriptValue || transcriptValue.length < 20) {
      return;
    }
    let cancelled = false;
    setDetectingLanguage(true);
    detectTranscriptLanguage(transcriptValue)
      .then((result) => {
        if (cancelled) return;
        setLanguageDetection(result);
        setResolvedLanguage(result.language);
      })
      .catch(() => {
        if (!cancelled) {
          setLanguageDetection(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetectingLanguage(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [languageValue, transcriptValue]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoId) {
      setError('Validate video before uploading transcript.');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('videoId', videoId);
    formData.append('language', languageValue ?? 'auto');
    const response = await uploadTranscript(formData);
    const document = response.document;
    setSegments(document.segments);
    setValue('transcript', joinSegments(document.segments));
    if (response.detection) {
      setLanguageDetection(response.detection);
      setResolvedLanguage(response.detection.language);
      if (languageValue !== 'auto') {
        setValue('language', response.detection.language);
      }
    }
  };

  const onValidate = async (values: AnalysisForm) => {
    setError(null);
    const { valid, videoId: parsedId, error: validationError } = await validateUrl(values.url);
    if (!valid || !parsedId) {
      setError(validationError ?? 'URL validation failed');
      return;
    }
    setVideoId(parsedId);
    try {
      const videoMeta = await fetchMeta(parsedId);
      setMeta(videoMeta);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSubmit = async (values: AnalysisForm) => {
    try {
      setLoading(true);
      setError(null);
      setSentiment(null);
      setTemplateOutput(null);
      setExportLinks([]);
      if (!videoId) {
        await onValidate(values);
      }
      const languageForRequest = values.language === 'auto' ? resolvedLanguage : values.language;
      const basePayload = {
        videoId: videoId || 'manual',
        language: languageForRequest,
        transcript: values.transcript
      };
      const [summaryResult, mindMapResult, keywordResult, sentimentResult, templateResult] = await Promise.all([
        analyzeSummary({ ...basePayload, length: values.length as SummaryLength }),
        analyzeMindMap(basePayload),
        analyzeKeywords(basePayload),
        analyzeSentiment(basePayload).catch(() => null),
        requestTemplate({ ...basePayload, kind: selectedTemplate }).catch(() => null)
      ]);
      setSummary(summaryResult);
      setMindMap(mindMapResult);
      setKeywords(keywordResult);
      setSentiment(sentimentResult ?? null);
      setTemplateOutput(templateResult ?? null);
      setSegments((current) => (current.length ? current : fallbackSegments(values.transcript)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runQuestion = async () => {
    if (!question.trim()) return;
    try {
      setLoading(true);
      const transcriptText = segments.length ? joinSegments(segments) : transcriptValue ?? '';
      const languageForQa = languageValue === 'auto' ? resolvedLanguage : languageValue ?? 'en';
      const answer = await analyzeQA({
        videoId: videoId || 'manual',
        language: languageForQa,
        transcript: transcriptText,
        question
      });
      setQaHistory((prev) => [answer, ...prev]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportHandler = async (format: ExportFormat) => {
    if (!transcriptValue && !segments.length) {
      setError('Provide a transcript before exporting results.');
      return;
    }
    try {
      setLoading(true);
      const languageForExport = languageValue === 'auto' ? resolvedLanguage : languageValue ?? 'en';
      const transcriptText = segments.length ? joinSegments(segments) : transcriptValue ?? '';
      const ticket = await requestExport({
        videoId: videoId || 'manual',
        language: languageForExport,
        transcript: transcriptText,
        format
      });
      setExportLinks((current) => [{ ...ticket, format }, ...current.filter((link) => link.url !== ticket.url)]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const requestTemplateForKind = async (kind: TemplateKind) => {
    if (!transcriptValue && !segments.length) {
      setError('Provide a transcript before generating templates.');
      return;
    }
    try {
      setLoading(true);
      const languageForTemplate = languageValue === 'auto' ? resolvedLanguage : languageValue ?? 'en';
      const transcriptText = segments.length ? joinSegments(segments) : transcriptValue ?? '';
      const template = await requestTemplate({
        videoId: videoId || 'manual',
        language: languageForTemplate,
        transcript: transcriptText,
        kind
      });
      setTemplateOutput(template);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const summaryContent = useMemo(() => {
    if (!summary) return null;
    return (
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold text-slate-900">Short</h3>
          <pre className="whitespace-pre-wrap rounded bg-white p-4 text-sm text-slate-700 shadow">{summary.short}</pre>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-slate-900">Medium</h3>
          <pre className="whitespace-pre-wrap rounded bg-white p-4 text-sm text-slate-700 shadow">{summary.medium}</pre>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-slate-900">Detailed</h3>
          <pre className="whitespace-pre-wrap rounded bg-white p-4 text-sm text-slate-700 shadow">{summary.detailed}</pre>
        </section>
        <section>
          <h3 className="text-lg font-semibold text-slate-900">Chapters</h3>
          <ul className="space-y-2">
            {summary.chapters.map((chapter, index) => (
              <li key={`${chapter.title}-${index}`} className="rounded border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-sm font-medium text-slate-900">{chapter.title}</p>
                <p className="text-xs text-slate-500">
                  {formatSeconds(chapter.start)} – {formatSeconds(chapter.end)}
                </p>
                {chapter.description && (
                  <p className="text-sm text-slate-600">{chapter.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }, [summary]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">YouTube Insight Analyzer</h1>
            <p className="text-sm text-slate-500">Transcript-first analysis with provider selection</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700" htmlFor="provider">
              AI Provider
            </label>
            <select
              id="provider"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              value={provider}
              onChange={(event) => setProvider(event.target.value as ProviderOption)}
            >
              <option value="local">Local (Fallback)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <form className="space-y-4 rounded-lg bg-white p-6 shadow" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="url">
                YouTube URL
              </label>
              <div className="flex gap-2">
                <input
                  id="url"
                  type="url"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="https://www.youtube.com/watch?v=..."
                  {...register('url')}
                />
                <button
                  type="button"
                  className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white"
                  onClick={handleSubmit(onValidate)}
                >
                  Validate
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="language">
                Transcript language
              </label>
              <input
                id="language"
                type="text"
                list="language-options"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="auto"
                {...register('language')}
              />
              <datalist id="language-options">
                {languageOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              {languageValue === 'auto' && (
                <p className="text-xs text-slate-500" role="status" aria-live="polite">
                  {detectingLanguage ? 'Detecting language…' : 'Language will be detected automatically.'}
                  {languageDetection && !detectingLanguage && (
                    <>
                      {' '}
                      Detected {languageDetection.language.toUpperCase()} ({languageDetection.reliability},
                      {` ${(languageDetection.confidence * 100).toFixed(0)}%`}).
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="transcript">
                Transcript (paste or upload SRT/VTT)
              </label>
              <textarea
                id="transcript"
                className="h-40 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Paste transcript here..."
                {...register('transcript')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="file-upload">
                Upload SRT / VTT
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".srt,.vtt"
                className="block w-full text-sm"
                onChange={handleFileUpload}
              />
              <label className="text-sm font-medium text-slate-700" htmlFor="length">
                Summary detail
              </label>
              <select
                id="length"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                {...register('length')}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="detailed">Detailed</option>
              </select>
              <button
                type="submit"
                className="mt-4 w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-300"
                disabled={loading}
              >
                {loading ? 'Working…' : 'Analyze transcript'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {meta && (
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{(meta.title as string) ?? 'Video metadata'}</p>
              <p>{meta.description as string}</p>
            </div>
          )}
        </form>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Analysis sections">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 shadow'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <section className="mt-6 rounded-lg bg-white p-6 shadow">
          {activeTab === 'Summary' && summaryContent}
          {activeTab === 'Mind Map' && <MindMap data={mindMap} />}
          {activeTab === 'Transcript' && <TranscriptList segments={segments} />}
          {activeTab === 'Q&A' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="text"
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                  onClick={runQuestion}
                  disabled={loading}
                >
                  Ask
                </button>
              </div>
              <ul className="space-y-3">
                {qaHistory.map((qa) => (
                  <li key={qa.question} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">{qa.question}</p>
                    <p className="text-sm text-slate-700">{qa.answer}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 'Sentiment' && (
            sentiment ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Average sentiment score:{' '}
                  <span
                    className={`font-semibold ${
                      sentiment.averageScore > 0
                        ? 'text-emerald-600'
                        : sentiment.averageScore < 0
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {sentiment.averageScore.toFixed(2)}
                  </span>
                </p>
                <ol className="space-y-2">
                  {sentiment.points.map((point, index) => (
                    <li
                      key={`${point.time}-${index}`}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-900">{formatSeconds(point.time)}</span>
                      <span className="capitalize text-slate-600">{point.label}</span>
                      <span
                        className={`font-semibold ${
                          point.score > 0
                            ? 'text-emerald-600'
                            : point.score < 0
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {point.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Run an analysis to view the sentiment timeline.</p>
            )
          )}
          {activeTab === 'Heatmap' && (
            <p className="text-sm text-slate-500">Heatmap visualization is scheduled for Sprint 3.</p>
          )}
          {activeTab === 'Templates' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="text-sm font-medium text-slate-700" htmlFor="template-kind">
                  Template type
                </label>
                <select
                  id="template-kind"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  value={selectedTemplate}
                  onChange={async (event) => {
                    if (loading) return;
                    const kind = event.target.value as TemplateKind;
                    setSelectedTemplate(kind);
                    setTemplateOutput(null);
                    await requestTemplateForKind(kind);
                  }}
                >
                  {templateKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.charAt(0).toUpperCase() + kind.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  onClick={() => requestTemplateForKind(selectedTemplate)}
                  disabled={loading}
                >
                  Generate template
                </button>
              </div>
              {templateOutput ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Summary:</span> {templateOutput.summary}
                  </p>
                  <div className="space-y-3">
                    {Object.entries(templateOutput.content).map(([key, value]) => (
                      <div key={key} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold capitalize text-slate-900">{key}</p>
                        <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {Array.isArray(value)
                            ? value
                                .map((item) =>
                                  typeof item === 'string' ? item : JSON.stringify(item, null, 2)
                                )
                                .join('\n')
                            : typeof value === 'string'
                            ? value
                            : JSON.stringify(value, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Generate a template to view structured insights.</p>
              )}
            </div>
          )}
          {activeTab === 'Export' && (
            <div className="space-y-4">
              <ExportButtons onExport={exportHandler} disabled={loading || !summary} />
              {exportLinks.length > 0 ? (
                <ul className="space-y-2">
                  {exportLinks.map((link) => (
                    <li key={link.url} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                      <span className="font-medium text-slate-900">
                        {link.format.toUpperCase()} export ready
                      </span>
                      <span className="text-xs text-slate-500">
                        Expires {new Date(link.expiresAt).toLocaleTimeString()}
                      </span>
                      <a
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Generate an export to receive a download link.</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
