import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: './web',
  plugins: [react()],
  server: {
    port: 5177,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: false },
      '/auth': { target: 'http://localhost:8787', changeOrigin: false },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
