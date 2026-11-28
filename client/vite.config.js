import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'vendor-charts', test: /node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/, priority: 25 },
            { name: 'vendor-dnd', test: /node_modules[\\/]@dnd-kit[\\/]/, priority: 20 },
            { name: 'vendor-socket', test: /node_modules[\\/](socket\.io-client|engine\.io-client)[\\/]/, priority: 20 },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 15 },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
