# Engineering Decisions

## Authentication

**Custom JWT over NextAuth**  
The schema already had a `User` model with a `password` field, and the requirements called for a specific 90-day session expiry. Rolling a thin custom layer with `jose` (HS256 JWT in an httpOnly cookie) was simpler than wiring NextAuth to a pre-existing user table. Trade-off: we own the token rotation and logout logic; NextAuth would handle that for free at the cost of more schema migration and configuration.

**bcrypt cost factor 12**  
Cost 10 is the bcrypt default; 12 roughly doubles hashing time (~300ms on a modern CPU). This is a deliberate trade-off: slower login in exchange for meaningfully higher brute-force resistance. Cost 14+ would be more secure but noticeably degrades UX.

---

## Seat Locking

**Optimistic transaction inside Prisma `$transaction`**  
The lock route reads the seat status and writes the new status inside a single serializable transaction. Two simultaneous requests for the same seat will result in one winner and one `409 Conflict` — no application-level mutex or Redis lock needed. This holds as long as a single PostgreSQL instance is the source of truth.

**10-minute lock window**  
Long enough for a user to read the page and complete a mock payment; short enough that an abandoned lock doesn't block other users for too long. In a real system this would be configurable and tied to the payment provider's session timeout.

---

## Lock Expiry Cleanup

**Background worker (instrumentation.ts) + page-level safety net**  
The primary cleanup runs every 60 seconds via a `setInterval` started in Next.js's `instrumentation.ts` hook (runs once on server startup, Node.js runtime only). This means locks always expire within ~1 minute regardless of traffic.

The seats page and `GET /api/seats` also call `cleanupExpiredSeats()` on every load as a belt-and-suspenders measure — this ensures a user loading the page right after a lock expires sees fresh data immediately, without waiting up to 60s for the next worker tick.

Trade-off: the page-level call adds one extra DB query per seats-page load. Removing it and accepting eventual consistency (up to 60s stale) would be a valid choice under higher load.

---

## Payment

**Mock payment flow instead of Stripe**  
A real Stripe integration would add API key management, webhook signature verification, and test-mode ceremony that distracts from the core reservation logic. The mock `/api/payment/confirm` endpoint mirrors exactly what a real Stripe webhook handler would do: an atomic transaction that marks the reservation `PAID` and the seat `RESERVED`. Swapping it for real Stripe is a matter of replacing the endpoint with a webhook listener and adding a Stripe Checkout redirect — the downstream logic is identical.

**Idempotent confirm endpoint**  
The confirm handler checks `status === 'PAID'` before writing. This is the same pattern you'd need for a real payment webhook, which can fire more than once. It costs one extra read but guarantees the handler is safe to call multiple times.

---

## Logging

**Structured JSON to stdout**  
Each log line is a single JSON object with `ts`, `level`, `event`, and optional context fields. This is the standard format expected by log aggregators (Datadog, CloudWatch, Loki). In development the output is noisy but parseable; in production it plugs straight into any log pipeline without a log agent needing to parse freeform text.

No external logging library (Pino, Winston) was added to keep dependencies minimal. The pattern is identical — swap `console.log(JSON.stringify(...))` for `pino(...)` if throughput or async logging becomes a concern.

---

## Testing

**Vitest over Jest**  
The project is `"type": "module"` (ESM). Jest requires Babel or `--experimental-vm-modules` to handle ESM; Vitest handles it natively. The API is compatible, so migrating tests to Jest later is trivial if the team has a strong preference.

**Unit tests for business logic, not route handlers**  
The seat locking and payment logic was extracted into `lib/seats.ts` and `lib/payment.ts` so it can be tested without spinning up a Next.js server. Prisma is mocked at the module boundary. This keeps tests fast (no DB, no HTTP) and focused on the invariants that matter: idempotency, authorization checks, and state machine transitions.

---

## What's Not Done (Known Gaps)

- **Rate limiting on auth endpoints** — login and register are brute-forceable. The fix is a middleware that counts attempts per IP (e.g. Upstash Redis + `@upstash/ratelimit`).
- **Horizontal scaling** — the Prisma transaction prevents double-booking within a single DB, but connection pool limits under high concurrency are untuned. A PgBouncer layer would be needed before scaling out.
- **Admin interface** — seat count is seeded manually via `/api/seed`. A real system would have an admin page to manage inventory.
- **Session revocation** — JWTs are stateless; there is no token blocklist. Logout deletes the cookie client-side but the token remains valid until expiry. A short expiry + refresh token pattern, or a Redis blocklist on logout, would fix this.
