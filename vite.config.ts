import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep default minify and terser/esbuild settings
    rollupOptions: {
      output: {
        // Create focused vendor chunks and split very large app modules
        manualChunks(id) {
          if (!id) return undefined

          // Split the heaviest page into its own chunk
          if (id.includes('/src/pages/Messaging') || id.includes('\\src\\pages\\Messaging')) {
            return 'chunk-messaging'
          }

          // Third-party libraries from node_modules
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (/[\\/]react-router-dom[\\/]/.test(id)) return 'vendor-router'
            if (/[\\/](react|react-dom)[\\/]/.test(id)) return 'vendor-react'
            if (/[\\/]firebase[\\/]/.test(id)) return 'vendor-firebase'
            if (/(jspdf|html2canvas|jszip)/.test(id)) return 'vendor-pdf'
            // Fallback vendor chunk for other deps
            return 'vendor-misc'
          }

          return undefined
        },
        // Better chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
