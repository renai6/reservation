'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function PaymentActions({
  reservationId,
  expiresAt,
}: {
  reservationId: string
  expiresAt: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'pay' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!expiresAt) return

    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        router.push('/seats')
        return
      }
      const m = Math.floor(diff / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [expiresAt, router])

  const handleAction = async (action: 'confirm' | 'fail') => {
    setLoading(action === 'confirm' ? 'pay' : 'cancel')
    setError(null)

    const res = await fetch(`/api/payment/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(null)
      return
    }

    router.push(action === 'confirm' ? '/payment/success' : '/seats')
  }

  return (
    <div className="space-y-3">
      {timeLeft && (
        <p className="text-center text-sm text-muted-foreground">
          Seat held for{' '}
          <span className="font-mono font-semibold tabular-nums">{timeLeft}</span>
        </p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        className="w-full"
        onClick={() => handleAction('confirm')}
        disabled={loading !== null}
      >
        {loading === 'pay' ? 'Processing...' : 'Pay $20.00'}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleAction('fail')}
        disabled={loading !== null}
      >
        {loading === 'cancel' ? 'Cancelling...' : 'Cancel'}
      </Button>
    </div>
  )
}
