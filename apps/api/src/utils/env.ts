import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_OAUTH_TOKEN: z.string().optional(),
  AI_RUNTIME_PROVIDER: z.enum(['local', 'openai', 'gemini']).default('local'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
  REDIS_URL: z.string().optional()
});

type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export const getEnv = (): Env => {
  if (cachedEnv) return cachedEnv;
  cachedEnv = EnvSchema.parse(process.env);
  return cachedEnv;
};
