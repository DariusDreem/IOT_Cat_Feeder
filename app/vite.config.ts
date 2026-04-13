import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permet l'accès depuis le réseau local
    proxy: {
      '/api': {
        target: 'http://192.168.1.100', // Remplacer par l'IP de l'ESP8266
        changeOrigin: true,
      },
    },
  },
})
