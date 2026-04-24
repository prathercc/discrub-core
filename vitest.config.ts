import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/**/*.test.ts',
        'lib/**/*.spec.ts',
        'lib/types/**',
        'lib/enum/**',
        'lib/**/*.d.ts',
        'lib/**/index.ts',
        'node_modules/**',
        'dist/**',
        '.storybook/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },

    // Global setup
    globals: true,

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,

    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Test file patterns
    include: ['lib/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.storybook'],
  },
});
