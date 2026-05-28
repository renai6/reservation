# Candidate

Name: Raffi Muloc
Technical Assessment: Senior / Lead Engineer

# Seat Reservation

A small public seat reservation platform built with Next.js 16, Tailwind CSS, Shadcn UI, Prisma, and PostgreSQL.

Users can register, log in, select one of 3 available seats, and complete a mock payment to reserve it.

## Tech Stack

- **Framework:** Next.js 16.2 (App Router)
- **Styling:** Tailwind CSS v4 + Shadcn UI
- **Database:** PostgreSQL via Prisma 7 (pg adapter)
- **Auth:** Custom JWT auth with `jose` + `bcryptjs` (httpOnly cookie, 90-day session)

## Prerequisites

- Node.js 20.9+
- pnpm
- PostgreSQL instance (local or remote)

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd reservation
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/reservationdb?schema=public"

# Secret key for signing JWT session tokens (any random 32+ byte string)
JWT_SECRET="your-random-secret-here"
```

To generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set up the database

Run the Prisma migration to create tables:

```bash
pnpm prisma migrate deploy
```

```bash
pnpm pnpm prisma generate
```

### 4. Start the development server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 5. Seed the seats

On first run, create the 3 seats by visiting this URL in your browser (or via curl):

```bash
curl http://localhost:3000/api/seed
```

This is safe to run multiple times — it uses upsert and won't duplicate data.

## Usage

1. Go to [http://localhost:3000](http://localhost:3000)
2. Register a new account
3. Select an available seat from the grid
4. Click **Pay $20.00** on the payment page to confirm the reservation
5. Click **Cancel** to release the seat back to the pool

## How It Works

### Seat states

| State     | Meaning                                                   |
| --------- | --------------------------------------------------------- |
| Available | Free to select                                            |
| Locked    | Held for up to 10 minutes while someone completes payment |
| Reserved  | Permanently booked                                        |

### Highlights

- **Race condition prevention** — seat locking uses a Prisma transaction: reads current status and writes atomically, so two simultaneous clicks on the same seat result in one success and one `409 Conflict`.
- **Lock expiry** — `cleanupExpiredSeats()` runs on every page load and resets stale LOCKED seats (and their associated PENDING reservations) back to available.
- **Auth security** — passwords are hashed with bcrypt (cost 12); sessions are HS256 JWTs stored in `httpOnly`, `SameSite=Strict` cookies with a 90-day expiry.
- **userId from token only** — the server never trusts a userId from the request body; it always reads from the verified JWT.
- **Payment idempotency** — the confirm endpoint checks whether a reservation is already `PAID` before updating, making it safe to call more than once.
- **Failure recovery** — cancelling a payment atomically marks the reservation `FAILED` and immediately unlocks the seat.

## Project Structure

```
app/
  actions/auth.ts          # register / login / logout server actions
  api/
    seats/route.ts         # GET seats (auth required)
    seats/lock/route.ts    # POST lock a seat
    payment/confirm/       # POST confirm mock payment
    payment/fail/          # POST cancel and release seat
    seed/                  # GET seed 3 seats (dev only)
  layout.tsx               # Root layout with nav
  page.tsx                 # Landing page
  login/                   # Login page
  register/                # Register page
  seats/                   # Seat selection (protected)
  payment/[reservationId]/ # Payment page (protected)
  payment/success/         # Confirmation page
lib/
  auth.ts                  # JWT sign / verify / getSession
  cleanup.ts               # cleanupExpiredSeats()
  prisma.ts                # Prisma client singleton
proxy.ts                   # Route protection (Next.js 16 middleware)
prisma/schema.prisma       # Database schema
```
