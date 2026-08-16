/**
 * PII Masking and Sanitization Utilities
 * Prevents sensitive personal data (phone numbers, emails, tokens, passwords)
 * from being leaked into application logs.
 */

/**
 * Masks a phone number so only country prefix and last 4 digits are visible.
 * Example: "+14155552671" -> "+14****2671"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const str = String(phone).trim();
  if (str.length <= 6) return '****';
  const prefix = str.slice(0, 3);
  const suffix = str.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Masks an email address.
 * Example: "john.doe@example.com" -> "j***e@example.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const str = String(email).trim();
  const parts = str.split('@');
  if (parts.length !== 2) return '****';
  const [local, domain] = parts;
  if (local.length <= 2) return `*@${domain}`;
  const maskedLocal = `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Recursively redacts sensitive keys in log payload objects.
 */
export function redactPII<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item)) as unknown as T;
  }

  const sensitiveKeys = new Set([
    'password',
    'password_hash',
    'passwordHash',
    'token',
    'access_token',
    'accessToken',
    'api_key',
    'apiKey',
    'secret',
    'otp',
    'code',
  ]);

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveKeys.has(key) || sensitiveKeys.has(lowerKey)) {
      redacted[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone')) {
      redacted[key] = typeof value === 'string' ? maskPhone(value) : '[REDACTED_PHONE]';
    } else if (lowerKey.includes('email')) {
      redacted[key] = typeof value === 'string' ? maskEmail(value) : '[REDACTED_EMAIL]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPII(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}
