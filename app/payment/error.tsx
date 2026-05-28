'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[payment error]', error)
  }, [error])

  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-xl font-semibold">Payment page error</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Something went wrong loading your booking. Your seat lock may have expired.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/seats">Choose a different seat</Link>
        </Button>
      </div>
    </main>
  )
}
