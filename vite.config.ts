import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function maplibreWorkerPlugin(): Plugin {
  return {
    name: 'maplibre-worker-copy',
    buildStart() {
      const rootDir = import.meta.dirname ?? path.resolve();
      const publicAssetsDir = path.resolve(rootDir, 'public/assets');
      if (!fs.existsSync(publicAssetsDir)) {
        fs.mkdirSync(publicAssetsDir, { recursive: true });
      }
      const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
      for (const file of files) {
        const src = path.resolve(rootDir, 'node_modules/maplibre-gl/dist', file);
        const dest = path.resolve(publicAssetsDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), maplibreWorkerPlugin()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/kg-media': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
