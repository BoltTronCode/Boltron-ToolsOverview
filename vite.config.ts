import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Set SINGLEFILE=1 to inline all JS/CSS into one self-contained index.html
// that can be opened directly from disk (file://) with no server.
const singleFile = process.env.SINGLEFILE === '1'

// When building for GitHub Pages the app is served from /<repo>/, so assets
// need that base path. Set GHPAGES=1 (the deploy workflow does this).
const ghPages = process.env.GHPAGES === '1'

// https://vite.dev/config/
export default defineConfig({
  base: singleFile ? './' : ghPages ? '/boltron-dashboard/' : '/',
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
})
