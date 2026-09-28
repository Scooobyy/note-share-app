import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const shareTypeEnum = pgEnum('share_type', ['ONE_TIME', 'TIME_BASED']);
export const accessTypeEnum = pgEnum('access_type', ['PUBLIC', 'PASSWORD']);

// --- Users ---
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
  })
);

// --- Notes ---
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    shareType: shareTypeEnum('share_type').notNull(),
    accessType: accessTypeEnum('access_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notes_user_idx').on(t.userId),
  })
);

// --- Shares ---
// NOTE: we store token_hash (SHA-256 of raw token), never the raw token.
// The raw token only ever lives in the URL handed to the user.
export const shares = pgTable(
  'shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    // bcrypt hash of the access key, only set when accessType = PASSWORD
    passwordHash: text('password_hash'),
    shareType: shareTypeEnum('share_type').notNull(),
    accessType: accessTypeEnum('access_type').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    // set exactly once when a ONE_TIME link is successfully consumed
    usedAt: timestamp('used_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('shares_token_hash_unique').on(t.tokenHash),
    noteIdx: index('shares_note_idx').on(t.noteId),
  })
);

// --- Share attempts (for rate limiting brute-force) ---
export const shareAttempts = pgTable(
  'share_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shareId: uuid('share_id')
      .notNull()
      .references(() => shares.id, { onDelete: 'cascade' }),
    ip: text('ip').notNull(),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    shareIpIdx: index('share_attempts_share_ip_idx').on(t.shareId, t.ip, t.createdAt),
  })
);

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Share = typeof shares.$inferSelect;