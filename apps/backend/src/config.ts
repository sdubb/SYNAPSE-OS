import { z } from 'zod';

export const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(16).default('synapse-os-default-secret-key-change-in-prod'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/synapse'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).default('INFO'),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const errorDetails = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Invalid application configuration:\n${errorDetails}`);
  }
  return result.data;
}

export const config = loadConfig();
