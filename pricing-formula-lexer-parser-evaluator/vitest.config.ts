import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // The reference snapshot has its own spec that imports app-only packages.
    exclude: ['node_modules', 'reference'],
  },
});
