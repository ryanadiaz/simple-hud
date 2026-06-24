import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

// ── iOS bridge plugin ─────────────────────────────────────────────────────────
// Provides:
//   GET  /events   — SSE stream for browser (auto-reconnects)
//   POST /notify   — iOS Shortcuts → push a notification
//   POST /health   — iOS Shortcuts → push health data
// No extra npm dependencies — uses Node's built-in http module.
// ── Plugin ────────────────────────────────────────────────────────────────────

function hudBridgePlugin(): Plugin {
  const clients = new Set<ServerResponse>()

  function broadcast(type: string, data: Record<string, unknown>) {
    const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`
    for (const res of [...clients]) {
      try {
        res.write(msg)
      } catch {
        clients.delete(res)
      }
    }
  }

  function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk: Buffer) => (body += chunk.toString()))
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'))
        } catch {
          reject(new Error('Bad JSON'))
        }
      })
      req.on('error', reject)
    })
  }

  return {
    name: 'hud-bridge',
    configureServer(server) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? ''
          const method = req.method ?? ''

          // CORS preflight
          if (method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            })
            res.end()
            return
          }

          // SSE endpoint
          if (url === '/events' && method === 'GET') {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'Access-Control-Allow-Origin': '*',
            })
            res.write(': connected\n\nretry: 3000\n\n')
            clients.add(res)
            req.on('close', () => clients.delete(res))
            return
          }

          // POST /notify — iOS Shortcuts pushes a notification
          if (url === '/notify' && method === 'POST') {
            readBody(req)
              .then((data) => {
                broadcast('notification', data)
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                })
                res.end(JSON.stringify({ ok: true, clients: clients.size }))
              })
              .catch(() => {
                res.writeHead(400)
                res.end('Bad JSON')
              })
            return
          }

          // POST /health — iOS Shortcuts pushes steps + calories
          if (url === '/health' && method === 'POST') {
            readBody(req)
              .then((data) => {
                broadcast('health', data)
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                })
                res.end(JSON.stringify({ ok: true }))
              })
              .catch(() => {
                res.writeHead(400)
                res.end('Bad JSON')
              })
            return
          }

          next()
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [hudBridgePlugin(), react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      '@evenrealities/even_hub_sdk',
      '@jappyjan/even-better-sdk',
      'upng-js',
    ],
  },
})
