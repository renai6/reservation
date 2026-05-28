import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { confirmPayment } from '@/lib/payment'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifyToken(token) : null
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { reservationId } = await req.json()
    const result = await confirmPayment(reservationId, session.userId)
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment confirmation failed'
    logger.error('payment.confirm.error', { error: message, userId: session.userId })
    return Response.json({ error: message }, { status: 409 })
  }
}
