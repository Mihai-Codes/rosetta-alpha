import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Codecov bundle analysis — only active when CODECOV_TOKEN is set (CI)
let codecovPlugin: any[] = []
try {
  const { codecovVitePlugin } = require('@codecov/vite-plugin')
  if (process.env.CODECOV_TOKEN) {
    codecovPlugin = [
      codecovVitePlugin({
        enableBundleAnalysis: true,
        bundleName: 'rosetta-alpha-frontend',
        uploadToken: process.env.CODECOV_TOKEN,
      }),
    ]
  }
} catch {
  // plugin not installed locally — skip silently
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...codecovPlugin,
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
