import { describe, expect, it } from 'vitest';

import { createChatTraceId } from '..';

describe('AI ChatCommand trace', () => {
  it('creates an unpredictable 32-hex trace before the request', () => {
    const values = new Set(Array.from({ length: 32 }, () => createChatTraceId()));

    expect(values.size).toBe(32);
    for (const value of values) {
      expect(value).toMatch(/^tr_[0-9a-f]{32}$/);
    }
  });
});
