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
        lines: 50,
        functions: 40,
        branches: 40,
        statements: 50,
      },
    },
  },
});
