import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 4 coverage gate', () => {
  it('keeps all four thresholds at 70 without excluding product management surfaces', () => {
    const config = readFileSync(join(process.cwd(), 'vitest.config.ts'), 'utf8');
    for (const metric of ['branches', 'functions', 'lines', 'statements']) {
      expect(config).toMatch(new RegExp(`${metric}: 70`));
    }
    for (const protectedPath of [
      'src/hooks/business/**',
      'src/service/api/**',
      'src/store/modules/ai/**',
      'src/views/ai/**',
      'src/views/system/**'
    ]) {
      expect(config).not.toContain(`'${protectedPath}'`);
    }
  });
});
