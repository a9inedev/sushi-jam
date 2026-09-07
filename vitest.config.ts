import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
    // The level generator can hold a worker for a while on slow runners; give the runner RPC room too.
    hookTimeout: 120000,
  },
});
