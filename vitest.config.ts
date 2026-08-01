import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Tests must not depend on a local .env — chain.ts/config.ts throw on
    // missing env vars at import time, so stub them before any test imports.
    setupFiles: ['tests/setup.ts'],
  },
});
