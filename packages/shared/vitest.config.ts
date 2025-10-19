import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8'
    }
  }
});
