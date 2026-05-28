import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PaymentActions } from './PaymentActions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ reservationId: string }>
}) {
  const { reservationId } = await params
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) redirect('/login')

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { seat: true },
  })

  if (!reservation || reservation.userId !== userId) notFound()

  if (reservation.status === 'PAID') redirect('/payment/success')
  if (reservation.status === 'FAILED') redirect('/seats')

  // Seat lock expired — send back to choose again
  if (reservation.seat.status !== 'LOCKED') redirect('/seats')

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Complete Your Booking</CardTitle>
          <CardDescription>
            Seat {reservation.seat.seatNumber} is reserved for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seat</span>
              <span className="font-medium">#{reservation.seat.seatNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">$20.00</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>$20.00</span>
            </div>
          </div>
          <PaymentActions
            reservationId={reservationId}
            expiresAt={reservation.seat.lockedUntil?.toISOString() ?? null}
          />
        </CardContent>
      </Card>
    </main>
  )
}
