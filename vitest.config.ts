import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/__tests__/**/*.test.{ts,tsx}',
      'electron/__tests__/**/*.test.ts',
    ],
    // DB tests are excluded from the default run on macOS/Node 26
    // because better-sqlite3 must be compiled for Node.js (not Electron).
    // Run `npm run test:db` separately on Linux/Node 20 (or after `npm rebuild better-sqlite3`).
    exclude: process.env.INCLUDE_DB_TESTS ? [] : ['electron/__tests__/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}', 'electron/**/*.ts'],
      exclude: ['src/main.tsx', 'electron/main.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
