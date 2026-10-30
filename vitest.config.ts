import { defineConfig } from 'vitest/config';

// E2E (tests/e2e/*.spec.ts) roda com Playwright, não com o Vitest.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
