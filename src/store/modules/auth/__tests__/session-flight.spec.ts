import { describe, expect, it } from 'vitest';
import { createSingleFlightAction } from '../shared';

describe('session-scoped reset single-flight', () => {
  it('coalesces the current reset but cannot swallow a later identity reset', async () => {
    let revision = 'A';
    let calls = 0;
    const completions: (() => void)[] = [];
    const reset = createSingleFlightAction(
      async () => {
        calls++;
        revision = 'anonymous-' + calls;
        await new Promise<void>(resolve => {
          completions.push(resolve);
        });
      },
      () => revision
    );
    const first = reset();
    expect(reset()).toBe(first);
    expect(calls).toBe(1);
    revision = 'B';
    const second = reset();
    expect(second).not.toBe(first);
    expect(calls).toBe(2);
    completions[0]();
    await first;
    expect(reset()).toBe(second);
    completions[1]();
    await second;
  });
});
