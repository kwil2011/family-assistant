import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
}); 