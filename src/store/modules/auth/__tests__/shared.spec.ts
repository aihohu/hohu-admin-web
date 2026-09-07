import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightAction } from '../shared';

describe('auth reset coordination', () => {
  it('coalesces concurrent resets and allows a later reset', async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });
    const action = vi
      .fn()
      .mockImplementationOnce(() => pending)
      .mockResolvedValue(undefined);
    const reset = createSingleFlightAction(action);

    const first = reset();
    const concurrent = reset();

    expect(concurrent).toBe(first);
    expect(action).toHaveBeenCalledTimes(1);
    release();
    await first;

    await reset();
    expect(action).toHaveBeenCalledTimes(2);
  });
});
