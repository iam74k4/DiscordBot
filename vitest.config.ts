import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
        'src/shared/utils/chart.ts', // Canvas/Chart.js rendering – integration-style
        'src/handlers/**', // Command/event loader bootstrap
        'src/app-scripts/**', // CLI maintenance scripts
        'src/events/**', // Discord event handlers (integration)
      ],
      // Current minimum thresholds: lines 26%, functions 28%, branches 21%, statements 26%
      thresholds: {
        lines: 26,
        functions: 28,
        branches: 21,
        statements: 26,
      },
    },
  },
});
