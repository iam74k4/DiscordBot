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
        'src/types/**',
        'src/index.ts',
        'src/client.ts',
      ],
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 25,
        statements: 30,
      },
    },
  },
});
