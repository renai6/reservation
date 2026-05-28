import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { confirmPayment, failPayment } from './payment'
import { prisma } from './prisma'
import { logger } from './logger'

function makeMockTx() {
  return {
    reservation: { update: vi.fn().mockResolvedValue({}) },
    seat: { update: vi.fn().mockResolvedValue({}) },
  }
}

beforeEach(() => vi.clearAllMocks())

// ─── confirmPayment ──────────────────────────────────────────────────────────

describe('confirmPayment', () => {
  it('returns null when reservation is not found', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue(null)
    expect(await confirmPayment('res-1', 'user-1')).toBeNull()
  })

  it('returns null when reservation belongs to a different user', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'other-user',
      status: 'PENDING',
      seat: { status: 'LOCKED' },
    } as any)
    expect(await confirmPayment('res-1', 'user-1')).toBeNull()
  })

  it('is idempotent — skips the transaction when already PAID', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      status: 'PAID',
      seat: { status: 'RESERVED' },
    } as any)

    const result = await confirmPayment('res-1', 'user-1')

    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('payment.confirm.idempotent', expect.any(Object))
    expect(result).not.toBeNull()
  })

  it('throws when the seat lock has expired', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      status: 'PENDING',
      seat: { status: 'AVAILABLE' },
    } as any)

    await expect(confirmPayment('res-1', 'user-1')).rejects.toThrow('Seat lock has expired')
  })

  it('throws when reservation is in a non-payable state', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      status: 'FAILED',
      seat: { status: 'AVAILABLE' },
    } as any)

    await expect(confirmPayment('res-1', 'user-1')).rejects.toThrow('not in a payable state')
  })

  it('runs an atomic transaction on success', async () => {
    const mockTx = makeMockTx()
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      seatId: 'seat-1',
      status: 'PENDING',
      seat: { status: 'LOCKED' },
    } as any)
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    await confirmPayment('res-1', 'user-1')

    expect(mockTx.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAID' } }),
    )
    expect(mockTx.seat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESERVED' }) }),
    )
    expect(logger.info).toHaveBeenCalledWith('payment.confirmed', expect.any(Object))
  })
})

// ─── failPayment ─────────────────────────────────────────────────────────────

describe('failPayment', () => {
  it('returns null when reservation is not found', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue(null)
    expect(await failPayment('res-1', 'user-1')).toBeNull()
  })

  it('returns null when reservation belongs to a different user', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'other-user',
      status: 'PENDING',
    } as any)
    expect(await failPayment('res-1', 'user-1')).toBeNull()
  })

  it('throws when reservation is not PENDING', async () => {
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      status: 'PAID',
    } as any)

    await expect(failPayment('res-1', 'user-1')).rejects.toThrow('not pending')
  })

  it('unlocks the seat and marks reservation FAILED atomically', async () => {
    const mockTx = makeMockTx()
    vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
      id: 'res-1',
      userId: 'user-1',
      seatId: 'seat-1',
      status: 'PENDING',
    } as any)
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))

    await failPayment('res-1', 'user-1')

    expect(mockTx.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'FAILED' } }),
    )
    expect(mockTx.seat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'AVAILABLE' }) }),
    )
    expect(logger.info).toHaveBeenCalledWith('payment.cancelled', expect.any(Object))
  })
})
