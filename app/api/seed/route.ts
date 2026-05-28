import { prisma } from '@/lib/prisma'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not available in production' }, { status: 403 })
  }

  await Promise.all([
    prisma.seat.upsert({ where: { seatNumber: 1 }, update: {}, create: { seatNumber: 1 } }),
    prisma.seat.upsert({ where: { seatNumber: 2 }, update: {}, create: { seatNumber: 2 } }),
    prisma.seat.upsert({ where: { seatNumber: 3 }, update: {}, create: { seatNumber: 3 } }),
  ])

  return Response.json({ seeded: true, message: '3 seats ready' })
}
