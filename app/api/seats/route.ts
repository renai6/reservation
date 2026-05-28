import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { cleanupExpiredSeats } from '@/lib/cleanup'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifyToken(token) : null
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await cleanupExpiredSeats()
    const seats = await prisma.seat.findMany({ orderBy: { seatNumber: 'asc' } })
    return Response.json(seats)
  } catch (err) {
    logger.error('seats.fetch.error', { error: String(err), userId: session.userId })
    return Response.json({ error: 'Failed to fetch seats' }, { status: 500 })
  }
}
