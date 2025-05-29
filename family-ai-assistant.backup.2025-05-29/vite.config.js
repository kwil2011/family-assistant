import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  server: {
    port: 3000
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  }
}); 