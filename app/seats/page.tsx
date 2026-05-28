import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredSeats } from '@/lib/cleanup'
import { SeatGrid } from './SeatGrid'

export default async function SeatsPage() {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) redirect('/login')

  await cleanupExpiredSeats()

  const [rawSeats, userReservations] = await Promise.all([
    prisma.seat.findMany({ orderBy: { seatNumber: 'asc' } }),
    prisma.reservation.findMany({
      where: { userId, status: 'PAID' },
      select: { seatId: true },
    }),
  ])

  const userReservedSeatIds = userReservations.map((r) => r.seatId)

  // Serialize Dates for the client component boundary
  const seats = rawSeats.map((s) => ({
    ...s,
    lockedUntil: s.lockedUntil?.toISOString() ?? null,
  }))

  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-6 p-4">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Seat</h1>
        <p className="text-muted-foreground">Select an available seat to proceed to payment.</p>
      </div>
      <SeatGrid seats={seats} userReservedSeatIds={userReservedSeatIds} />
    </main>
  )
}
