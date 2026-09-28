import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72), // bcrypt truncates at 72 bytes
});

export const loginSchema = registerSchema;

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
  expiresAt: z.string().datetime(), // ISO string
  shareType: z.enum(['ONE_TIME', 'TIME_BASED']),
  accessType: z.enum(['PUBLIC', 'PASSWORD']),
  // optional — if TIME_BASED, the share expiry; else ignored
  shareExpiresAt: z.string().datetime().optional(),
});

export const unlockShareSchema = z.object({
  password: z.string().min(1).max(128),
});