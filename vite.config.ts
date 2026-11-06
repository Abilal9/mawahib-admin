import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths load on the custom domain and on the project page.
  base: './',
  test: {
    environment: 'jsdom',
  },
})
