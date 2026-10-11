import { defineConfig } from 'vite';

// Relative base so the build works at a GitHub Pages project path or a custom domain root.
export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
