import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Dev only: saves what the game posts to /__dump/<name> (see src/game/office/map/dumpMap.ts) into the open OpenSpec change
const dumpDir = path.resolve(import.meta.dirname, 'openspec/changes/bathroom-side-by-side-map-loader')
const mapDump = {
  name: 'map-dump',
  apply: 'serve' as const,
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/susan-and-gloria/__dump', (req, res) => {
      const name = (req.url ?? '').replace(/^\//, '')
      if (req.method !== 'POST' || !/^[\w-]+$/.test(name)) { res.statusCode = 400; res.end(); return }
      const chunks: Buffer[] = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        fs.writeFileSync(path.join(dumpDir, `${name}.json`), Buffer.concat(chunks))
        res.end('ok')
      })
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mapDump],
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