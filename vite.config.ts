import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/todolist/',
  plugins: [react()],
  server: {
    port: 4000,
    host: true,
    strictPort: true
  }
})
