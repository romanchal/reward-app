import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:4000',
      VITE_CDN_URL: process.env.VITE_CDN_URL || '',
    }),
  },
  server: {
    host: '0.0.0.0',
    port: 4175,
    strictPort: false,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4175,
    strictPort: false,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': import.meta.dirname + '/src',
    },
  },
  build: {
    outDir: 'dist',
  },
});