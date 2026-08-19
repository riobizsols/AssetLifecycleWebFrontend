import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: 'esbuild',
    reportCompressedSize: false,
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
})
