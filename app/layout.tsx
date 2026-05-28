import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' })
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Seat Reservation',
  description: 'Book your seat securely',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = token ? await verifyToken(token) : null

  return (
    <html
      lang="en"
      className={cn('h-full antialiased', geistSans.variable, geistMono.variable, instrumentSans.variable, 'font-sans')}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex h-16 items-center justify-between border-b px-6">
          <Link href="/" className="font-semibold text-lg">
            SeatReserve
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">{session.email}</span>
                <form action={logoutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    Logout
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
