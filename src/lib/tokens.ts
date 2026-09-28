import { createHash, randomBytes } from 'crypto';
import { customAlphabet } from 'nanoid';

/**
 * Generate a URL-safe share token (~43 chars, ~256 bits entropy).
 * We use randomBytes for cryptographic strength.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 hash of a token. Deterministic so we can look up by hash.
 * NOT bcrypt — we need speed because we hash on every share request.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a short human-friendly access key for password-protected links.
 * Format: XXXX-XXXX-XXXX (uppercase alnum, no confusing chars).
 * Shown ONCE to the note owner at share-creation time.
 */
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const nanoid = customAlphabet(alphabet, 12);

export function generateAccessKey(): string {
  const raw = nanoid();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}