import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@sudobility/writing_core': fileURLToPath(
        new URL('../writing_core/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
