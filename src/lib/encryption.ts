import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Generate a guaranteed 32-byte key from the environment variable or fallback
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY || 'pingstack-fallback-secret-development-key';
  return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
};

export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getKey()), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (err) {
    console.error('Encryption failing:', err);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getKey()), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failing:', err);
    return text; // Return raw string if fallback
  }
}
