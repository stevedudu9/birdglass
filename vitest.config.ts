import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Feature backups keep stale copies of tests whose imports no longer resolve.
  test: { pool: 'forks', maxWorkers: 1, testTimeout: 20_000, hookTimeout: 20_000,
    exclude: ['**/node_modules/**', '**/dist/**', '.feature-backups/**'] },
});
