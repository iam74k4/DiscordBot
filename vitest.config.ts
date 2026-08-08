import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/__tests__/helpers/vitest-env.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/shared/types/**',
        'src/index.ts',
        'src/client.ts',
        'src/handlers/**', // Command/event loader bootstrap
        'src/app-scripts/**', // CLI maintenance scripts
        'src/events/**', // Discord event handlers (integration)
      ],
      // Current minimum thresholds: lines 46%, functions 52%, branches 38%, statements 45%
      // (measured 49.7 / 56.2 / 41.2 / 48.5 — raise these as coverage grows)
      thresholds: {
        lines: 46,
        functions: 52,
        branches: 38,
        statements: 45,
      },
    },
  },
});
