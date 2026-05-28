import { cleanupExpiredSeats } from '@/lib/cleanup'
import { logger } from '@/lib/logger'

const INTERVAL_MS = 60_000
let started = false

export function startCleanupWorker() {
  if (started) return
  started = true

  logger.info('cleanup.worker.started', { intervalMs: INTERVAL_MS })

  const run = async () => {
    try {
      const count = await cleanupExpiredSeats()
      if (count > 0) logger.info('cleanup.worker.ran', { expiredSeats: count })
    } catch (err) {
      logger.error('cleanup.worker.error', { error: String(err) })
    }
  }

  run()
  setInterval(run, INTERVAL_MS)
}
