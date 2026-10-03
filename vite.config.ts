import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, defaultExclude } from 'vitest/config';

// Thư mục skill vendored (không phải code của dự án) — tránh để vitest quét
// nhầm các fixture *.test.js trong evals/ của agent-skills-main.
const VENDORED_DIRS = ['agent-skills-main/**', '.agents/**'];

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    test: {
      // exclude mặc định của vitest + các thư mục vendored
      exclude: [...defaultExclude, ...VENDORED_DIRS],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    build: {
      // Suppress chunk size warnings — our vendor bundle is large but split
      chunkSizeWarningLimit: 1000,
    },
  };
});
