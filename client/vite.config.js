import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    include: /\.[jt]sx?$/,
    exclude: [],
    loader: 'jsx',
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          // Split NASA data libraries
          nasa: ['@tanstack/react-query', 'axios'],
          // Split visualization libraries
          viz: ['d3', 'framer-motion'],
          // Split utility libraries
          utils: ['lodash', 'react-window', 'react-intersection-observer'],
        },
      },
    },
    // Mobile optimization settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for better performance
    target: ['es2015', 'chrome58', 'firefox57', 'safari11'],
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },

  // CSS configuration - PostCSS is handled by external postcss.config.cjs
  css: {
    postcss: './postcss.config.cjs',
  },

  // Environment variables prefix
  envPrefix: 'REACT_APP_',

  })