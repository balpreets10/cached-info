import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    // Default: unit/integration tests that don't need a live DB. DB-backed
    // tests guard themselves on TEST_DATABASE_URL.
    include: ['src/**/*.test.js'],
  },
});
