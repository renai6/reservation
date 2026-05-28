import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <LoginForm from={from} />
    </main>
  )
}
