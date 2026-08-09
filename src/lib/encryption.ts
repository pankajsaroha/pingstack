import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Derives a guaranteed 32-byte AES key from the ENCRYPTION_KEY env var.
 *
 * - In production: throws immediately if ENCRYPTION_KEY is not set.
 * - In development: logs a loud warning and falls back to a deterministic
 *   dev-only key so local dev still works without requiring the env var.
 *
 * NEVER commit or ship the fallback key to production.
 */
const getKey = (): string => {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[encryption] ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate one with: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"'
      );
    }
    // Development-only fallback — deterministic so existing dev DB values still decrypt
    console.warn(
      '[encryption] WARNING: ENCRYPTION_KEY is not set. Using dev-only fallback key. ' +
      'This MUST be set in production.'
    );
    return crypto
      .createHash('sha256')
      .update('pingstack-dev-only-insecure-key')
      .digest('base64')
      .substring(0, 32);
  }

  return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
};

export function encrypt(text: string): string {
  if (!text) return text;
  // Let errors propagate — callers already have try/catch that return 500.
  // Silently storing plaintext on encryption failure is far worse than a 500.
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getKey()), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  // Let errors propagate — returning the raw ciphertext on failure would be
  // silently passed to Meta API and cause a hard-to-debug auth error anyway.
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() as string, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getKey()), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
