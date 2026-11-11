import { defineConfig } from 'vitest/config';

// Tests run PostgreSQL locally without browser globals or live application data.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/features/relatorio-final/laudosSeguranca.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});