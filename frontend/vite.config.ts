/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './__tests__/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
