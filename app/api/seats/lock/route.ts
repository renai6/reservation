import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { lockSeat, SeatNotAvailableError } from '@/lib/seats'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifyToken(token) : null
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { seatId } = await req.json()
    const result = await lockSeat(seatId, session.userId)
    return Response.json(result)
  } catch (err) {
    if (err instanceof SeatNotAvailableError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    logger.error('seat.lock.error', { error: String(err), userId: session.userId })
    return Response.json({ error: 'Failed to lock seat' }, { status: 500 })
  }
}
