# YouTube Insight Analyzer (YIA)

Transcript-first analytics platform delivering summaries, mind maps, keyword insights and Q&A for YouTube videos without downloading media.

## Monorepo structure

- `apps/web` – React + Vite client with TailwindCSS and accessibility-first tabbed UI.
- `apps/api` – Express API providing /youtube, /transcript and /analyze endpoints with caching.
- `packages/ai-core` – Unified AI abstraction supporting OpenAI, Gemini and local heuristic provider.
- `packages/shared` – Shared Zod schemas, types and transcript utilities.
- `packages/ui` – Reusable UI widgets (mind map, heatmap, export buttons).
- `infra` – Dockerfiles, docker-compose stack and environment examples.

## Getting started

```bash
pnpm install
pnpm dev
```

This starts both API (port 4000) and web client (port 5173).

### Environment variables

Copy `.env.example` to `.env` and adjust providers.

- `AI_RUNTIME_PROVIDER` – `local`, `openai`, or `gemini`.
- `OPENAI_API_KEY` / `GEMINI_API_KEY` – Provider credentials (backend only).
- `YOUTUBE_API_KEY` – Metadata lookup (Data API v3).
- `YOUTUBE_OAUTH_TOKEN` – Optional for captions download (requires OAuth consent).
- `REDIS_URL` – Optional cache backend.

## Testing

```bash
pnpm test
```

Unit tests run via Vitest across shared utilities. Extend coverage as features land.

## Docker

```bash
cd infra
cp api.env.example api.env
docker-compose up --build
```

## Security & compliance

- No video/audio downloads, transcript-only processing.
- Structured JSON errors, CORS and rate limiting enforced.
- Provider secrets remain server-side; client communicates via proxy endpoints only.
