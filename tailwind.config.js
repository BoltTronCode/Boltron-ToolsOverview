/**
 * Tailwind configuration for the WiSUN Throughput Calculator.
 *
 * Author  : Bhautik Ramoliya
 * Company : Boltron Telesystems Private Limited
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Boltron brand-inspired light palette
        base: {
          950: '#ffffff',
          900: '#ffffff',
          850: '#f8fafc',
          800: '#eef2f7',
          700: '#e2e8f0',
          600: '#cbd5e1',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#b6dbff',
          300: '#82c1ff',
          400: '#489dff',
          500: '#1f78ff',
          600: '#0a5cf5',
          700: '#0847d1',
          800: '#0c3aa8',
          900: '#103585',
        },
        accent: {
          cyan: '#22d3ee',
          teal: '#2dd4bf',
          amber: '#f59e0b',
          rose: '#fb7185',
          violet: '#a78bfa',
          lime: '#a3e635',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(31,120,255,0.18), 0 10px 30px -18px rgba(31,120,255,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.9) inset, 0 12px 32px -24px rgba(15,23,42,0.16)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(31,120,255,0.12), transparent 55%)',
      },
    },
  },
  plugins: [],
}
