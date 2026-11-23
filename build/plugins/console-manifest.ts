import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { version } from '../../package.json';

export function consoleManifest(): Plugin {
  return {
    name: 'verified-admin-console',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const commit = existsSync('.git')
          ? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
          : process.env.WEB_SOURCE_SHA;
        // Source archives may be used for an ordinary local build without a Git identity.
        if (!commit) return;
        if (!/^[a-f0-9]{40}$/.test(commit) || (process.env.WEB_SOURCE_SHA && process.env.WEB_SOURCE_SHA !== commit))
          throw new Error('Console source commit mismatch');
        const files: Record<string, string> = {};
        for (const [name, item] of Object.entries(bundle)) {
          files[name] = createHash('sha256')
            .update(item.type === 'chunk' ? item.code : item.source)
            .digest('hex');
        }
        for (const name of ['favicon.ico', 'licenses/LICENSE', 'licenses/NOTICE', 'licenses/THIRD_PARTY_NOTICES.md']) {
          files[name] = createHash('sha256')
            .update(readFileSync(resolve('public', name)))
            .digest('hex');
        }
        this.emitFile({
          type: 'asset',
          fileName: 'policy-preparation.json',
          source: JSON.stringify({ protocol: 'field-management/2', version, sourceCommit: commit, files })
        });
      }
    }
  };
}
