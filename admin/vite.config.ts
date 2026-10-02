import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify({
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:4000',
      VITE_CDN_URL: process.env.VITE_CDN_URL || '',
    }),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': import.meta.dirname + '/src',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 4176,
    strictPort: false,
    open: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4176,
    strictPort: false,
  },
});