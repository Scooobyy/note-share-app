# Note Share — Secure, Expiring Note Links

A full-stack note-sharing app that lets authenticated users create notes and generate secure share links with fine-grained access control: **one-time or time-based** expiry, **public or password-protected** access, plus the ability to **revoke** any link at any moment.

Built as a POC for the MERN/PERN Stack Developer task.

## Links

| | |
|---|---|
| **Live demo** | https://note-taking-app-psi-ten.vercel.app |
| **GitHub** | https://github.com/Scooobyy/note-share-app |
| **Demo video** | https://drive.google.com/file/d/1og9v5SvgDbzg3MUSd001LWGX5-eF7u0g/view?usp=drive_link |
| **Technical walkthrough** | https://www.loom.com/share/95005c8b84134fd68a9684fbb2f4f959 |
| **Test credentials** | `test@example.com` / `password123` |

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Full-stack, server components, easy Vercel deploy |
| Language | **TypeScript** | Type safety across client, server, DB |
| API | **Hono** mounted at `/api/hono/*` | Explicitly required by task, edge-ready, fast |
| DB | **PostgreSQL (Neon)** | Preferred by task, serverless, free tier |
| ORM | **Drizzle** | SQL-first, type-safe, atomic UPDATE support |
| Auth | **Custom cookie sessions** (JWT via `jose` + bcrypt) | Fully explainable, no NextAuth black box |
| Validation | **Zod** | Runtime safety on all inputs |
| UI | **Tailwind + shadcn/ui** | Required by task, accessible, minimal |
| Deploy | **Vercel + Neon** | Zero-config, serverless, free |

## Setup Instructions

### Prerequisites
- Node.js 20+
- pnpm (or npm)
- A Neon Postgres database (https://neon.tech — free tier is enough)

### Steps

```bash
# 1. Clone
git clone https://github.com/Scooobyy/note-share-app.git
cd note-share-app

# 2. Install
pnpm install

# 3. Configure environment
cp .env.example .env
# Fill in the values (see below)

# 4. Push schema to Neon
pnpm db:push

# 5. Run
pnpm dev
```

Open http://localhost:3000

### Environment variables (`.env`)

```env
# Neon pooled connection string — copy from Neon dashboard
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"

# 32+ char random secret. Generate: `openssl rand -base64 32`
SESSION_SECRET="paste_here"

# Used to construct share URLs. Set to your Vercel URL in prod.
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Available scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate SQL migration from schema |
| `pnpm db:push` | Push schema changes to DB |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | text | **unique** — normalized to lowercase |
| password_hash | text | bcrypt cost 12 |
| created_at | timestamptz | |

### `notes`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users, ON DELETE CASCADE |
| title | text | |
| content | text | |
| expires_at | timestamptz | Note's own lifetime |
| share_type | enum | `ONE_TIME` \| `TIME_BASED` |
| access_type | enum | `PUBLIC` \| `PASSWORD` |
| created_at | timestamptz | |

### `shares`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| note_id | uuid | FK → notes, ON DELETE CASCADE |
| **token_hash** | text | **unique** — SHA-256 of raw token. Raw token NEVER stored. |
| password_hash | text \| null | bcrypt cost 12, only when `access_type = PASSWORD` |
| share_type | enum | duplicated from note for atomic claim queries |
| access_type | enum | |
| expires_at | timestamptz | |
| revoked_at | timestamptz \| null | null = active |
| used_at | timestamptz \| null | null = not yet consumed (one-time) |
| view_count | int | default 0, incremented atomically |
| created_at | timestamptz | |

### `share_attempts`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| share_id | uuid | FK → shares |
| ip | text | from `x-forwarded-for` |
| success | boolean | |
| created_at | timestamptz | |

Used for rate limiting wrong-password attempts. Index: `(share_id, ip, created_at)`.

## Share Link Flow

```
Owner creates note
       │
       ▼
Server generates 32-byte random token
       │
       ├─── hash = SHA-256(token)
       ├─── stores hash + note in DB (transactional)
       └─── returns raw token ONCE in share URL
                     │
                     ▼
        User opens /share/<token>
                     │
              GET /api/hono/share/:token  ←── read-only, idempotent
                     │
        ┌────────────┼────────────────┐
        │            │                │
     invalid      expired/used      ready
        │            │                │
      404          410/403      ┌─────┴──────┐
                                │            │
                          PUBLIC          PASSWORD
                                │            │
                    "Reveal note"       ask for password
                                │            │
                                ▼            ▼
                     POST /share/:token/view (password?)
                                │
                    ┌───────────┴───────────┐
                    │                       │
                 atomic claim            no claim
                 (UPDATE WHERE           (wrong pw →
                  used_at IS NULL)       401, no increment)
                    │
              ✓ view_count++ & used_at = NOW() (one-time)
                    │
                    ▼
                 return note content
```

**Critical design:** GET is **read-only** (safe under React Strict Mode, prefetch, retries, crawlers). Only the explicit POST `/view` mutates state.

## Password / Key Generation Logic

| Artifact | Algorithm | Entropy | Storage | Why |
|---|---|---|---|---|
| **Share token** | `crypto.randomBytes(32).toString('base64url')` | 256 bits | SHA-256 hash | High entropy → fast hash is fine; must be looked up by hash |
| **Access key** | `nanoid` w/ custom alphabet (`A-Z2-9` minus confusables), 12 chars, formatted `XXXX-XXXX-XXXX` | ~60 bits | bcrypt cost 12 | Human-typable; low entropy → needs slow hash |
| **User password** | user-chosen | varies | bcrypt cost 12 | Slow hash needed vs. dictionary attacks |

**Why SHA-256 for token but bcrypt for password?**
Tokens have 256 bits of entropy — brute-forcing SHA-256 output is infeasible regardless of speed. Passwords have maybe 30–40 bits — a fast hash would let an attacker try billions of guesses per second. Bcrypt's cost factor 12 adds ~250ms per guess, making brute-force impractical.

**Why hash the token at all?** So a DB dump doesn't leak working share links. The raw token lives only in the URL the owner receives and in the memory of the browser that opens it.

## Expiry Logic

Three independent gates on every read and write:
1. `revoked_at IS NULL`
2. `expires_at > NOW()`
3. For one-time links: `used_at IS NULL`

Every read endpoint evaluates all three **before** returning content. Every mutating query re-evaluates them **inside** the atomic UPDATE's WHERE clause, so a share that expires mid-request can't be consumed.

## Invalidate / Revoke Logic

`POST /api/hono/share/:shareId/revoke`:
1. Require session auth
2. Join `shares → notes` and verify `notes.user_id = session.userId`
3. Set `revoked_at = NOW()`

All subsequent GET and POST requests to that share's token return `403 { status: 'revoked' }`. Revocation is instant and irreversible (in this POC).

## View Count Logic

**Incremented only on successful content delivery.** Precisely:
- Public link: incremented in the atomic claim inside `POST /view` → 200 response includes content
- Password link: incremented **after** successful bcrypt verify, **inside** the same atomic UPDATE
- **Never** incremented for: wrong password, expired link, revoked link, invalid token, `GET /share/:token` inspection (which is read-only)

Implemented as `view_count = view_count + 1` inside SQL — **never** read-then-write. This eliminates the classic lost-update race: two concurrent requests both do `SET view_count = view_count + 1`, and Postgres serializes them correctly.

## Race-Condition Handling (the core of this task)

Two users click the same one-time link at the same millisecond. Both requests arrive at different serverless instances. **Only one must succeed.**

**Solution:** a single atomic SQL UPDATE, using `RETURNING` to detect whether we won:

```sql
UPDATE shares
SET used_at = NOW(),
    view_count = view_count + 1
WHERE id = $1
  AND used_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > NOW()
RETURNING id;
```

- Postgres takes a **row-level lock** during the UPDATE.
- Second concurrent request blocks until the first commits, then re-evaluates the WHERE clause.
- Because `used_at` is now non-null, the second request's WHERE fails → 0 rows returned → we respond `410 { status: 'used' }`.
- Exactly one winner. Guaranteed by the database, not by application code.

For TIME_BASED shares, the same pattern is used but without setting `used_at`:

```sql
UPDATE shares
SET view_count = view_count + 1
WHERE id = $1
  AND revoked_at IS NULL
  AND expires_at > NOW()
RETURNING id;
```

Still atomic, still safe under concurrency.

**Proof:** a 10-parallel-request test against a fresh one-time link produces exactly 1 `200 ok` and 9 `410 used`. Demonstrated in the demo video.

## Security Decisions

| Concern | Mitigation |
|---|---|
| Session theft via XSS | `HttpOnly` cookie — JS can't read it |
| Session hijack over HTTP | `Secure` flag in production |
| CSRF | `SameSite=Lax` + POST-only mutations + same-origin fetch |
| Token leakage from DB | Only SHA-256(token) stored |
| Password leakage from DB | bcrypt cost 12 |
| Brute-force on share passwords | DB-backed rate limit: 5 failed attempts per (share, IP) per 15 min |
| User enumeration on login | Same error + dummy bcrypt compare for nonexistent users |
| Replay via guessed tokens | 256-bit entropy (2^256 space) |
| Accidental consumption (crawlers, prefetch, retries) | GET is read-only; only POST `/view` consumes |
| SQL injection | Drizzle's parameterized queries |
| Malicious input | Zod schemas on all POST bodies |
| Password truncation surprise | Zod caps password at 72 bytes (bcrypt's limit) |

## Required Edge Cases — Status

| Case | Handled | Where |
|---|---|---|
| Invalid share link | ✅ | `GET /share/:token` → 404 |
| Public share link access | ✅ | `POST /share/:token/view` → returns content, count++ |
| Password-protected access | ✅ | Two-step: inspect → unlock |
| Wrong password | ✅ | 401, no count++, logged |
| Expired share | ✅ | 410, checked in WHERE clause |
| One-time link already used | ✅ | 410, checked via `used_at IS NULL` |
| Revoked share | ✅ | 403, checked via `revoked_at IS NULL` |
| Multiple users, one-time link | ✅ | Atomic UPDATE with `RETURNING` |
| Accurate view count | ✅ | SQL increment, no read-then-write |

## Required Answers (from the task brief)

**How do you prevent two users from using a one-time link at the same time?**
The claim is a single SQL `UPDATE ... WHERE used_at IS NULL ... RETURNING id`. Postgres locks the row for the duration of the UPDATE. The first transaction sets `used_at` and commits; the second sees `used_at IS NOT NULL` in its WHERE, updates 0 rows, and gets a 410 response. The database serializes concurrent updates — we don't rely on any application-level locking.

**How do you update view count safely?**
`SET view_count = view_count + 1` inside a single SQL statement. This is atomic in Postgres. We never read the value into the app and write back (that would be a lost-update race). Additionally, we guard the UPDATE with the same WHERE conditions used for the claim, so expired/revoked/used links never increment.

**How would this work if 1 million people opened the link?**
The correctness still holds — the atomic UPDATE is O(1) per request and serializes correctly at any concurrency. The bottleneck becomes throughput, not correctness:
- Add a **read replica** for `GET /share/:token` inspection (which is the hot path for non-consuming requests) and for public time-based reads.
- Keep the **primary** for the claim UPDATE (`POST /view`) — this must be serialized for one-time links.
- Add **Redis** for rate-limiting state and share-metadata caching with a short TTL.
- A **CDN** in front of the app can cache the inspect response for public time-based links with `s-maxage` matching the remaining TTL; but a `Cache-Control: no-store` header must apply to one-time links' POST /view, since it's a mutation.
- The one-time-claim path remains a single-row UPDATE, so it scales with Postgres' write throughput (thousands/sec on a single primary). Beyond that, **sharding by share_id** or using a specialized lock service (e.g., Redis SETNX with TTL) becomes relevant.

**How would you prevent brute-force attempts on password-protected links?**
Current POC: a DB-backed rate limiter — 5 failed attempts per (share_id, IP) per 15 minutes, then 429. Every failed attempt is logged in `share_attempts`. In production I'd also: (a) use Redis with sliding-window counters instead of the DB for lower latency, (b) apply a global exponential backoff on the endpoint, (c) add a CAPTCHA or proof-of-work after N failures, (d) set a hard cap on total unlock attempts per share across all IPs (attacker might rotate IPs), (e) alert on abnormal failure rates, (f) always rate-limit even successful unlocks to prevent enumeration of valid passwords.

## Demo & Walkthrough

See the deliverables email for video links. The demo covers: note creation, share generation, public flow, password flow, dynamic password display, wrong-password case, one-time consumption, time-based expiry, revoke, view-count accuracy, and the 10-parallel-request race-condition proof.

## Project Structure

```
note-share-app/
├── drizzle/                          # Generated SQL migrations
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── notes/
│   │   │   ├── new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new-note-form.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── share-list.tsx
│   │   ├── share/
│   │   │   └── [token]/
│   │   │       ├── page.tsx
│   │   │       └── share-view.tsx
│   │   ├── api/
│   │   │   └── [[...route]]/route.ts   # Hono bridge
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                         # shadcn
│   │   └── logout-button.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   └── password.ts
│   │   ├── tokens.ts
│   │   ├── validation.ts
│   │   └── api.ts
│   ├── server/
│   │   └── hono/
│   │       ├── app.ts
│   │       ├── routes/
│   │       │   ├── auth.ts
│   │       │   ├── notes.ts
│   │       │   └── share.ts
│   │       └── middleware/
│   │           ├── auth.ts
│   │           └── rateLimit.ts
│   └── middleware.ts
├── .env.example
├── drizzle.config.ts
├── package.json
└── README.md
```

## Trade-offs & Known Limitations

- **Sessions are stateless JWTs.** No server-side revocation of sessions. For a POC this is fine; a production app would use a session table or Redis allow-list.
- **Rate limiting is DB-backed.** Simple and correct for serverless, but slower than Redis at scale. Swap point is isolated in `rateLimit.ts`.
- **No email verification.** Out of scope for the POC.
- **No password reset.** Out of scope.
- **Content not encrypted at rest** beyond Neon's default. Could be added with envelope encryption per note.
- **Access key is shown only once.** If the owner loses it before sharing, they must create a new share. This is intentional — we can't decrypt it (only hash is stored).
- **Serverless cold starts** on Vercel's free tier and Neon's free tier add 1–3s to first request after idle. Not a correctness issue.
