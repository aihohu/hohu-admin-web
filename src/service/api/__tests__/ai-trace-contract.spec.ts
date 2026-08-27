import { describe, expect, it } from 'vitest';
import * as api from '../ai-trace';

describe('AI Trace API contract', () => {
  it('exports independent list and detail clients', () => {
    expect(api.fetchAiTraceList).toBeTypeOf('function');
    expect(api.fetchAiTraceDetail).toBeTypeOf('function');
  });
});
