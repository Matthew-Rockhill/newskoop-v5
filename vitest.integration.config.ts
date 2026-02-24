import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/__tests__/integration/**/*.test.ts'],
    testTimeout: 30000, // DB tests need more time
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results-integration.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/newsroom': path.resolve(__dirname, './src/components/newsroom'),
      '@/admin': path.resolve(__dirname, './src/components/admin'),
      '@/ui': path.resolve(__dirname, './src/components/ui'),
    },
  },
});
