import { defineConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Reuse the same self-signed cert that was generated for the API server.
// When HTTPS_ENABLED=true the server is on https://...:3001, so Vite must
// also serve over HTTPS so that window.location.protocol matches and
// api-base.ts builds the correct https://... URL automatically.
const certsDir = path.resolve(__dirname, 'server', 'certs')
const keyPath  = path.join(certsDir, 'server.key')
const certPath = path.join(certsDir, 'server.crt')
const httpsConfig =
  fs.existsSync(keyPath) && fs.existsSync(certPath)
    ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    : undefined

// Proxy targets: use https when the backend runs with TLS, http otherwise.
// `secure: false` trusts the self-signed cert in HTTPS mode.
const backendHttp = httpsConfig ? 'https://localhost:3001' : 'http://localhost:3001'
const backendWs   = httpsConfig ? 'wss://localhost:3001'   : 'ws://localhost:3001'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,        // bind to 0.0.0.0 so LAN devices can reach the dev server
    https: httpsConfig, // HTTPS when cert exists, plain HTTP otherwise
    proxy: {
      // All API calls and WebSocket connections are proxied to the backend so
      // that LAN devices only need to reach port 5173 — they never connect to
      // port 3001 directly.
      '/api': {
        target:       backendHttp,
        changeOrigin: true,
        secure:       false, // accept self-signed cert in HTTPS mode
      },
      '/ws': {
        target: backendWs,
        ws:     true,
        secure: false,
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
