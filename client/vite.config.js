import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the SPA and API share an origin through this proxy, just as they do
// in production through the Vercel rewrite in vercel.json.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
