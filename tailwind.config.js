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
        // Boltron brand-inspired palette
        base: {
          950: '#070b14',
          900: '#0b1220',
          850: '#0f1729',
          800: '#131c30',
          700: '#1c2740',
          600: '#26334f',
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
        glow: '0 0 0 1px rgba(31,120,255,0.25), 0 8px 40px -12px rgba(31,120,255,0.45)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -20px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 50% 0%, rgba(31,120,255,0.12), transparent 55%)',
      },
    },
  },
  plugins: [],
}
