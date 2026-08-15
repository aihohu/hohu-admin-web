import { describe, expect, it } from 'vitest';
import { canEditAiAgent } from '../agent-permission';

describe('AI Agent edit visibility', () => {
  it('requires both the R_SUPER role and the edit permission', () => {
    expect(canEditAiAgent(['R_SUPER'], true)).toBe(true);
    expect(canEditAiAgent(['R_SUPER'], false)).toBe(false);
    expect(canEditAiAgent(['R_ADMIN'], true)).toBe(false);
    expect(canEditAiAgent([], true)).toBe(false);
  });
});
