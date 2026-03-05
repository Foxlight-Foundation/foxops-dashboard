import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./web/src/test-setup.ts'],
    include: ['web/src/**/*.spec.tsx', 'web/src/**/*.spec.ts'],
  },
});
