import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export class SeatNotAvailableError extends Error {
  constructor() {
    super('Seat not available')
    this.name = 'SeatNotAvailableError'
  }
}

export async function lockSeat(seatId: string, userId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const seat = await tx.seat.findUnique({ where: { id: seatId } })

    if (!seat) throw new SeatNotAvailableError()
    if (seat.status !== 'AVAILABLE') throw new SeatNotAvailableError()

    const updatedSeat = await tx.seat.update({
      where: { id: seatId },
      data: {
        status: 'LOCKED',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    const reservation = await tx.reservation.create({
      data: { userId, seatId, status: 'PENDING' },
    })

    return { updatedSeat, reservation }
  })

  logger.info('seat.locked', { seatId, userId, reservationId: result.reservation.id })
  return result
}
