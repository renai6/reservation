'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Seat = {
  id: string
  seatNumber: number
  status: 'AVAILABLE' | 'LOCKED' | 'RESERVED'
  lockedUntil: string | null
}

const STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Available',
    badgeVariant: 'default' as const,
    cardClass: 'border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:border-green-700',
  },
  LOCKED: {
    label: 'Locked',
    badgeVariant: 'secondary' as const,
    cardClass: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-700 opacity-75',
  },
  RESERVED: {
    label: 'Reserved',
    badgeVariant: 'destructive' as const,
    cardClass: 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-700 opacity-75',
  },
}

export function SeatGrid({ seats, userReservedSeatIds }: { seats: Seat[]; userReservedSeatIds: string[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reservedByUser = new Set(userReservedSeatIds)

  // Refresh seat status every 30s to catch lock expirations
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  const handleSelect = async (seatId: string) => {
    setLoading(seatId)
    setError(null)

    const lockRes = await fetch('/api/seats/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId }),
    })

    if (!lockRes.ok) {
      const data = await lockRes.json()
      setError(data.error ?? 'Failed to lock seat. Please try again.')
      setLoading(null)
      router.refresh()
      return
    }

    const { reservation } = await lockRes.json()
    router.push(`/payment/${reservation.id}`)
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-3 gap-4">
        {seats.map((seat) => {
          const config = STATUS_CONFIG[seat.status]
          const isAvailable = seat.status === 'AVAILABLE'
          const isLoading = loading === seat.id

          const isYours = reservedByUser.has(seat.id)

          return (
            <Card key={seat.id} className={cn('transition-colors', config.cardClass)}>
              <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
                <span className="text-5xl font-bold">{seat.seatNumber}</span>
                <Badge variant={config.badgeVariant}>{config.label}</Badge>
                {isYours && (
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Reserved by you</p>
                )}
                {isAvailable && (
                  <Button
                    size="sm"
                    onClick={() => handleSelect(seat.id)}
                    disabled={loading !== null}
                    className="w-full"
                  >
                    {isLoading ? 'Selecting...' : 'Select'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Selected seats are held for 10 minutes while you complete payment.
      </p>
    </div>
  )
}
