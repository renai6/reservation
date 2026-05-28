import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function cleanupExpiredSeats(): Promise<number> {
  const expiredSeats = await prisma.seat.findMany({
    where: {
      status: 'LOCKED',
      lockedUntil: { lt: new Date() },
    },
    select: { id: true },
  })

  if (expiredSeats.length === 0) return 0

  const expiredIds = expiredSeats.map((s) => s.id)

  await prisma.$transaction([
    prisma.seat.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'AVAILABLE', lockedUntil: null },
    }),
    prisma.reservation.updateMany({
      where: { seatId: { in: expiredIds }, status: 'PENDING' },
      data: { status: 'FAILED' },
    }),
  ])

  logger.info('cleanup.expired_seats', { count: expiredSeats.length, seatIds: expiredIds })
  return expiredSeats.length
}
