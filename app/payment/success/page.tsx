import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuccessPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="text-5xl mb-2">🎉</div>
          <CardTitle>Booking Confirmed!</CardTitle>
          <CardDescription>Your seat has been reserved successfully.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/seats">View All Seats</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
