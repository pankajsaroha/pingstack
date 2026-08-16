import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

/**
 * Derives a guaranteed 32-byte AES key from a secret string.
 */
function deriveKey(secret: string): string {
  return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
}

/**
 * Resolves the primary key for new encrypt() calls.
 */
const getPrimaryKey = (): string => {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[encryption] ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate one with: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"'
      );
    }
    console.warn(
      '[encryption] WARNING: ENCRYPTION_KEY is not set. Using dev-only fallback key. ' +
      'This MUST be set in production.'
    );
    return deriveKey('pingstack-dev-only-insecure-key');
  }

  return deriveKey(secret);
};

/**
 * Returns candidate keys to attempt for decrypt() in priority order.
 * Ensures backward compatibility for DB records encrypted under previous fallback keys.
 */
const getCandidateKeys = (): string[] => {
  const keys: string[] = [];

  if (process.env.ENCRYPTION_KEY) {
    keys.push(deriveKey(process.env.ENCRYPTION_KEY));
  }

  // Backward compatibility candidate keys for tokens encrypted prior to ENCRYPTION_KEY setting
  keys.push(deriveKey('pingstack-fallback-secret-development-key'));
  keys.push(deriveKey('pingstack-dev-only-insecure-key'));

  return keys;
};

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getPrimaryKey()), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;

  const textParts = text.split(':');
  const ivHex = textParts.shift() as string;
  const encryptedHex = textParts.join(':');

  let iv: Buffer;
  let encryptedText: Buffer;
  try {
    iv = Buffer.from(ivHex, 'hex');
    encryptedText = Buffer.from(encryptedHex, 'hex');
  } catch {
    return text;
  }

  const candidateKeys = getCandidateKeys();

  for (const keyStr of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(keyStr), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const result = decrypted.toString('utf8');

      // Sanity check: valid UTF-8 string without replacement characters
      if (result && !result.includes('\uFFFD')) {
        return result;
      }
    } catch {
      // Try next candidate key
    }
  }

  console.error('[encryption] Decryption failed for all candidate keys. Check ENCRYPTION_KEY or re-connect account.');
  return text;
}
