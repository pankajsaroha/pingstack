/**
 * Environment variable validation utility.
 * Validates required environment variables and fails fast on startup in production.
 */

export interface EnvConfig {
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  REDIS_URL: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function validateEnv(): EnvConfig {
  const isProd = process.env.NODE_ENV === 'production';

  const required: Array<{ key: string; name: string }> = [
    { key: 'JWT_SECRET', name: 'JWT signing secret' },
    { key: 'ENCRYPTION_KEY', name: 'AES token encryption key' },
    { key: 'REDIS_URL', name: 'Redis connection URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', name: 'Supabase URL' },
  ];

  const missing: string[] = [];

  for (const { key, name } of required) {
    if (!process.env[key]) {
      missing.push(`${key} (${name})`);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[ENV VALIDATION ERROR] Missing required environment variable(s):\n  - ${missing.join('\n  - ')}`;
    if (isProd) {
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.warn(`[ENV WARNING] ${errorMsg}\nRunning in development mode.`);
    }
  }

  return {
    JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'dev-encryption-key',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}
