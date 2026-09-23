import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Prefer the sibling repo's source when it is checked out alongside this one (local dev, the
// "local-packages phase"); otherwise fall back to the real, published `@sudobility/writing_core`
// npm dependency (declared in package.json) — this is what lets CI, which checks out only this one
// repo, still resolve it via node_modules instead of a `../writing_core` path that does not exist there.
const writingCoreSrc = fileURLToPath(new URL('../writing_core/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: {
    alias: existsSync(writingCoreSrc) ? { '@sudobility/writing_core': writingCoreSrc } : {},
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
