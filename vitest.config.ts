import path from 'path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: server/API tests run in Node and don't need the
// Tailwind/React plugins used for the client build.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
