export async function register() {
  // Only run in the Node.js runtime — not Edge, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCleanupWorker } = await import('@/lib/cleanup-worker')
    startCleanupWorker()
  }
}
