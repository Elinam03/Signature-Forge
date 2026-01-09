/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#12121a',
          tertiary: '#1a1a25',
          elevated: '#222230',
        },
        accent: {
          green: '#00ff88',
          pink: '#ff00aa',
          cyan: '#00ccff',
          yellow: '#ffcc00',
        },
        border: {
          subtle: '#2a2a35',
          default: '#3a3a45',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        ui: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0, 255, 136, 0.25)',
        'glow-pink': '0 0 20px rgba(255, 0, 170, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 204, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
