import { URL, fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), vueJsx(), Icons({ compiler: 'vue3' })],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'packages/**',
        'src/components/**',
        'src/hooks/common/**',
        'src/layouts/**',
        'src/locales/**',
        'src/router/**',
        'src/service/request/**',
        'src/store/modules/app/**',
        'src/store/modules/auth/**',
        'src/store/modules/contributes/**',
        'src/store/modules/route/**',
        'src/store/modules/tab/**',
        'src/store/modules/theme/**'
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  }
});
