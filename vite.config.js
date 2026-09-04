import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Avoid colliding with the SPA route /assets (reload would 403 on the build folder)
    assetsDir: 'static',
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
