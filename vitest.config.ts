import { URL, fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), Icons({ compiler: 'vue3' })],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.spec.ts']
  }
});
