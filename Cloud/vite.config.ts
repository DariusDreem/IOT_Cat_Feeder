import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permet l'accès depuis le réseau local
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Backend local
        changeOrigin: true,
      },
    },
  },
})
