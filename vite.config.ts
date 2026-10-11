import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Serves fixtures/api/* as /api/* during development, until the platform's read
// API exists. Set SINGULARITY_API=http://192.168.1.110:8080 to proxy instead.
function fixtureApi(): Plugin {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures', 'api')
  return {
    name: 'fixture-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const player = url.match(/^\/api\/players\/by-name\/([^/]+)\/?$/)
        if (player) {
          let name = ''
          try { name = decodeURIComponent(player[1]) } catch { name = '' }
          if (!/^[A-Za-z0-9 _.-]{1,64}$/.test(name)) return next()
          const file = join(root, 'players', `${name}.json`)
          try {
            const body = await readFile(file)
            res.setHeader('Content-Type', 'application/json')
            res.end(body)
          } catch {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'player not found' }))
          }
          return
        }
        const m = url.match(/^\/api\/matches(?:\/([0-9a-f-]{36}))?\/?$/)
        if (!m) return next()
        const file = m[1] ? join(root, 'matches', `${m[1]}.json`) : join(root, 'matches.json')
        try {
          const body = await readFile(file)
          res.setHeader('Content-Type', 'application/json')
          res.end(body)
        } catch {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'match not found' }))
        }
      })
    },
  }
}

const api = process.env.SINGULARITY_API

export default defineConfig({
  plugins: [svelte(), ...(api ? [] : [fixtureApi()])],
  server: api ? { proxy: { '/api': api } } : undefined,
})
