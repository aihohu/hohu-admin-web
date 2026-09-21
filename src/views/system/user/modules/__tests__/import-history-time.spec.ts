import { describe, expect, it } from 'vitest';
import { formatImportTime } from '../import-history-time';

describe('import history time', () => {
  it('shows equivalent instants consistently across server offsets', () => {
    expect(formatImportTime('2026-09-16T04:00:00Z')).toBe(formatImportTime('2026-09-16T12:00:00+08:00'));
  });
  it('does not display invalid or missing timestamps', () => {
    expect(formatImportTime(null)).toBe('-');
    expect(formatImportTime('invalid')).toBe('-');
  });
});
