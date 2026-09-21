import { describe, expect, it, vi } from 'vitest';
import { createSingleFlightAction, watchAuthSession } from '../shared';

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

describe('cross-tab auth boundary', () => {
  it('clears the old view on login/logout without modifying the new credentials', () => {
    let snapshot = 'login-a:true';
    const changed = vi.fn();
    const sync = watchAuthSession(() => snapshot, changed);
    snapshot = 'login-b:true';
    window.dispatchEvent(new Event('storage'));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(snapshot).toBe('login-b:true');
    window.dispatchEvent(new Event('focus'));
    expect(changed).toHaveBeenCalledTimes(1);
    snapshot = 'login-b:false';
    window.dispatchEvent(new Event('pageshow'));
    expect(changed).toHaveBeenCalledTimes(2);
    sync.stop();
  });

  it('accepts a local login and ignores token renewals without a login revision change', () => {
    let snapshot = 'login-a:true';
    const changed = vi.fn();
    const sync = watchAuthSession(() => snapshot, changed);
    window.dispatchEvent(new Event('storage'));
    expect(changed).not.toHaveBeenCalled();
    snapshot = 'login-b:true';
    sync.accept();
    window.dispatchEvent(new Event('focus'));
    expect(changed).not.toHaveBeenCalled();
    sync.stop();
    snapshot = 'login-c:true';
    window.dispatchEvent(new Event('storage'));
    expect(changed).not.toHaveBeenCalled();
  });
});
