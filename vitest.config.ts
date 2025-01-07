import { defineConfig as defineTestConfig } from 'vitest/config'
import { defineConfig as defineViteConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const viteConfig = defineViteConfig({
  plugins: [react()],
})

const testConfig = defineTestConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/playwright/**', '**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

export default {
  ...viteConfig,
  ...testConfig,
}
