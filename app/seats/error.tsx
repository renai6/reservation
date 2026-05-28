'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function SeatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[seats error]', error)
  }, [error])

  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 p-4 text-center">
      <h2 className="text-xl font-semibold">Failed to load seats</h2>
      <p className="text-sm text-muted-foreground">
        Could not connect to the database. Please try again.
      </p>
      <Button onClick={reset}>Retry</Button>
    </main>
  )
}
