import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    // en producción Laravel sirve el build desde public/spa (mismo dominio que la API)
    base: command === 'build' ? '/spa/' : '/',
    build: {
      outDir: '../backend/public/spa',
      emptyOutDir: true,
    },
    server: {
      // en desarrollo /api se redirige al backend Laravel (evita CORS)
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY ?? 'http://veterinaria-api.test',
          changeOrigin: true,
        },
      },
    },
  }
})
