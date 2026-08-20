import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/susan-and-gloria/',
  resolve: {
    tsconfigPaths: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(import.meta.dirname, 'src')],
      }
    }
  },
  server: {
    proxy: {
      '/api/duckduckgo': {
        target: 'https://html.duckduckgo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/duckduckgo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
})