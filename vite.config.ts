import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    // ===========================
    // Chunk Optimization Config
    // ===========================
    chunkSizeWarningLimit: 1000, // KB — suppress warning for chunks up to 1MB

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // ============================================
            // 1. React Core — loaded on every page
            // ============================================
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
              return 'react-core';
            }

            // ============================================
            // 2. Google GenAI + Auth stack
            //    (large: ~500KB+ combined)
            // ============================================
            if (
              id.includes('node_modules/@google/genai') ||
              id.includes('node_modules/google-auth-library') ||
              id.includes('node_modules/gaxios') ||
              id.includes('node_modules/google-p12-file') ||
              id.includes('node_modules/gtoken') ||
              id.includes('node_modules/node-fetch') ||
              id.includes('node_modules/extract-zip') ||
              id.includes('node_modules/archiver')
            ) {
              return 'google-genai';
            }

            // ============================================
            // 3. face-api.js — ML model, very large (~2MB)
            //    Only needed for check-in smile detection
            // ============================================
            if (id.includes('node_modules/face-api.js')) {
              return 'face-api';
            }

            // ============================================
            // 4. Motion (framer-motion) — animations
            // ============================================
            if (
              id.includes('node_modules/motion/') ||
              id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/motion-dom') ||
              id.includes('node_modules/motion-utils')
            ) {
              return 'motion';
            }

            // ============================================
            // 5. Lucide React — icon library
            // ============================================
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }

            // ============================================
            // 6. Everything else from node_modules
            //    (express, dotenv, tailwind internals, etc.)
            // ============================================
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
        },
      },

      // Optional: increase chunk size limit warning
      chunkSizeWarningLimit: 1000,
    },
  };
});
