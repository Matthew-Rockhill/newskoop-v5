import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results.json',
    },
    coverage: {
      reporter: ['text', 'json'],
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
