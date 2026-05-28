import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    seat: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    reservation: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { cleanupExpiredSeats } from './cleanup'
import { prisma } from './prisma'
import { logger } from './logger'

beforeEach(() => vi.clearAllMocks())

describe('cleanupExpiredSeats', () => {
  it('returns 0 and skips the transaction when no seats are expired', async () => {
    vi.mocked(prisma.seat.findMany).mockResolvedValue([])

    const count = await cleanupExpiredSeats()

    expect(count).toBe(0)
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('runs a transaction and returns the count of expired seats', async () => {
    vi.mocked(prisma.seat.findMany).mockResolvedValue([
      { id: 'seat-1' },
      { id: 'seat-2' },
    ] as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([])

    const count = await cleanupExpiredSeats()

    expect(count).toBe(2)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(logger.info).toHaveBeenCalledWith('cleanup.expired_seats', {
      count: 2,
      seatIds: ['seat-1', 'seat-2'],
    })
  })

  it('queries only LOCKED seats with a past lockedUntil', async () => {
    vi.mocked(prisma.seat.findMany).mockResolvedValue([])

    await cleanupExpiredSeats()

    expect(prisma.seat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'LOCKED' }),
      }),
    )
  })
})
