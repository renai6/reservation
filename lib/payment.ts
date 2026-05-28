import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function confirmPayment(reservationId: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { seat: true },
  })

  if (!reservation || reservation.userId !== userId) return null

  // Idempotency: already paid — safe to return success without touching the DB
  if (reservation.status === 'PAID') {
    logger.info('payment.confirm.idempotent', { reservationId, userId })
    return reservation
  }

  if (reservation.status !== 'PENDING') {
    throw new Error('Reservation is not in a payable state')
  }

  if (reservation.seat.status !== 'LOCKED') {
    throw new Error('Seat lock has expired')
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id: reservationId }, data: { status: 'PAID' } })
    await tx.seat.update({
      where: { id: reservation.seatId },
      data: { status: 'RESERVED', lockedUntil: null },
    })
  })

  logger.info('payment.confirmed', { reservationId, userId, seatId: reservation.seatId })
  return reservation
}

export async function failPayment(reservationId: string, userId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  })

  if (!reservation || reservation.userId !== userId) return null

  if (reservation.status !== 'PENDING') {
    throw new Error('Reservation is not pending')
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id: reservationId }, data: { status: 'FAILED' } })
    await tx.seat.update({
      where: { id: reservation.seatId },
      data: { status: 'AVAILABLE', lockedUntil: null },
    })
  })

  logger.info('payment.cancelled', { reservationId, userId, seatId: reservation.seatId })
  return reservation
}
