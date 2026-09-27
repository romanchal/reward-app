import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:4000',
      VITE_CDN_URL: process.env.VITE_CDN_URL || '',
    }),
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': __dirname + '/src',
    },
  },
  build: {
    outDir: 'dist',
  },
});