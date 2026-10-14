import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/load_default_dataset': 'http://127.0.0.1:8000',
      '/upload': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
    }
  }
})
