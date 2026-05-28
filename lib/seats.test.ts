import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { lockSeat, SeatNotAvailableError } from './seats'
import { prisma } from './prisma'

function makeMockTx(overrides: Record<string, unknown> = {}) {
  return {
    seat: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'seat-1', seatNumber: 1, status: 'LOCKED' }),
    },
    reservation: {
      create: vi.fn().mockResolvedValue({ id: 'res-1', userId: 'user-1', seatId: 'seat-1' }),
    },
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('lockSeat', () => {
  it('locks an available seat and creates a reservation', async () => {
    const mockTx = makeMockTx()
    mockTx.seat.findUnique.mockResolvedValue({ id: 'seat-1', status: 'AVAILABLE' })
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    const result = await lockSeat('seat-1', 'user-1')

    expect(mockTx.seat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'LOCKED' }),
      }),
    )
    expect(mockTx.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', seatId: 'seat-1', status: 'PENDING' }),
      }),
    )
    expect(result.reservation.id).toBe('res-1')
  })

  it('throws SeatNotAvailableError when seat is LOCKED', async () => {
    const mockTx = makeMockTx()
    mockTx.seat.findUnique.mockResolvedValue({ id: 'seat-1', status: 'LOCKED' })
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    await expect(lockSeat('seat-1', 'user-1')).rejects.toThrow(SeatNotAvailableError)
  })

  it('throws SeatNotAvailableError when seat is RESERVED', async () => {
    const mockTx = makeMockTx()
    mockTx.seat.findUnique.mockResolvedValue({ id: 'seat-1', status: 'RESERVED' })
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    await expect(lockSeat('seat-1', 'user-1')).rejects.toThrow(SeatNotAvailableError)
  })

  it('throws SeatNotAvailableError when seat does not exist', async () => {
    const mockTx = makeMockTx()
    mockTx.seat.findUnique.mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    await expect(lockSeat('seat-1', 'user-1')).rejects.toThrow(SeatNotAvailableError)
  })
})
