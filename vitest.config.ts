import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test-jwt-secret-at-least-32-bytes-long!!',
    },
  },
})
