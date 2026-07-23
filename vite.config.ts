import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` must match the GitHub Pages sub-path (https://<user>.github.io/<repo>/).
// It can be overridden at build time with VITE_BASE for custom hosting.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/wisun-throughput-calculator/',
  plugins: [react()],
})
