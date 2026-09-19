import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['services/**/*.ts', 'lib/**/*.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(configDirectory, '.')
    }
  }
});
