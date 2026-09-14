import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    environmentOptions: {
      jsdom: { url: 'http://localhost:3000' },
    },
  },
});