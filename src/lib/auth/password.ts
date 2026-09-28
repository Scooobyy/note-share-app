import bcrypt from 'bcryptjs';

const ROUNDS = 12; // ~250ms per hash on modern hardware; tune up in prod if needed

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}