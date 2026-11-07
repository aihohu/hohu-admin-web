import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import { setupUnocss } from './build/plugins/unocss';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd()) as unknown as Env.ImportMeta;
  return {
    base: '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./', import.meta.url))
      }
    },
    define: { BUILD_TIME: JSON.stringify(new Date().toISOString()) },
    plugins: [
      vue(),
      Components({ dts: false, resolvers: [NaiveUiResolver()] }),
      setupUnocss(env),
      {
        name: 'policy-preparation-manifest',
        generateBundle: {
          order: 'post',
          handler(_options, bundle) {
            const files = Object.fromEntries(
              Object.entries(bundle).map(([name, item]) => [
                name,
                createHash('sha256')
                  .update(item.type === 'chunk' ? item.code : item.source)
                  .digest('hex')
              ])
            );
            this.emitFile({
              type: 'asset',
              fileName: 'policy-preparation.json',
              source: JSON.stringify({
                protocol: 'field-management/1',
                version: '0.2.0',
                sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
                files
              })
            });
          }
        }
      }
    ],
    build: { outDir: 'dist-policy', emptyOutDir: true, rollupOptions: { input: 'policy-prepare.html' } }
  };
});
