import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestInstanceState } from '../type';

const mocks = vi.hoisted(() => ({
  fetchRefreshToken: vi.fn(),
  resetStore: vi.fn(),
  getStorage: vi.fn(),
  setStorage: vi.fn()
}));

vi.mock('../../api', () => ({
  fetchRefreshToken: mocks.fetchRefreshToken
}));

vi.mock('@/store/modules/auth', () => ({
  useAuthStore: () => ({ resetStore: mocks.resetStore })
}));

vi.mock('@/utils/storage', () => ({
  localStg: {
    get: mocks.getStorage,
    set: mocks.setStorage
  }
}));

import { handleExpiredRequest } from '../shared';

function requestState(): RequestInstanceState {
  return { errMsgStack: [], refreshTokenPromise: null };
}

describe('refresh single-flight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStorage.mockImplementation((key: string) => (key === 'refreshToken' ? 'refresh-token' : null));
  });

  it('shares one in-flight refresh and releases it immediately after success', async () => {
    let resolveRefresh: ((value: { error: null; data: { token: string; refreshToken: string } }) => void) | undefined;
    mocks.fetchRefreshToken.mockReturnValue(
      new Promise(resolve => {
        resolveRefresh = resolve;
      })
    );
    const state = requestState();

    const first = handleExpiredRequest(state);
    const second = handleExpiredRequest(state);

    expect(mocks.fetchRefreshToken).toHaveBeenCalledTimes(1);
    resolveRefresh?.({ error: null, data: { token: 'access-2', refreshToken: 'refresh-2' } });
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(state.refreshTokenPromise).toBeNull();
    expect(mocks.setStorage).toHaveBeenCalledWith('token', 'access-2');
    expect(mocks.setStorage).toHaveBeenCalledWith('refreshToken', 'refresh-2');
  });

  it('releases a failed refresh so a later request can make a new attempt', async () => {
    mocks.fetchRefreshToken.mockResolvedValue({ error: new Error('expired'), data: null });
    const state = requestState();

    await expect(handleExpiredRequest(state)).resolves.toBe(false);
    await expect(handleExpiredRequest(state)).resolves.toBe(false);

    expect(mocks.fetchRefreshToken).toHaveBeenCalledTimes(2);
    expect(mocks.resetStore).toHaveBeenCalledTimes(2);
    expect(state.refreshTokenPromise).toBeNull();
  });
});

describe('refresh completion belongs to its original session', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['success', 'failure'] as const)('does not mutate or log out B after late A %s', async outcome => {
    const storage = new Map([
      ['token', 'A-access'],
      ['refreshToken', 'A-refresh'],
      ['authSessionRevision', 'A']
    ]);
    mocks.getStorage.mockImplementation((key: string) => storage.get(key) || null);
    mocks.setStorage.mockImplementation((key: string, value: string) => storage.set(key, value));
    let finish!: (value: unknown) => void;
    mocks.fetchRefreshToken.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const job = handleExpiredRequest(requestState());
    storage.set('token', 'B-access');
    storage.set('refreshToken', 'B-refresh');
    storage.set('authSessionRevision', 'B');
    finish(
      outcome === 'success'
        ? { error: null, data: { token: 'A-next', refreshToken: 'A-next-refresh' } }
        : { error: new Error('A expired'), data: null }
    );
    await expect(job).resolves.toBe(false);
    expect(storage.get('token')).toBe('B-access');
    expect(storage.get('refreshToken')).toBe('B-refresh');
    expect(mocks.resetStore).not.toHaveBeenCalled();
  });
  it('gives B a separate flight and never lets A clear that promise', async () => {
    const storage = new Map([
      ['refreshToken', 'A-refresh'],
      ['authSessionRevision', 'A']
    ]);
    mocks.getStorage.mockImplementation((key: string) => storage.get(key) || null);
    mocks.setStorage.mockImplementation((key: string, value: string) => storage.set(key, value));
    const finishes: ((value: unknown) => void)[] = [];
    mocks.fetchRefreshToken.mockImplementation(
      () =>
        new Promise(resolve => {
          finishes.push(resolve);
        })
    );
    const state = requestState();
    const first = handleExpiredRequest(state);
    storage.set('refreshToken', 'B-refresh');
    storage.set('authSessionRevision', 'B');
    const second = handleExpiredRequest(state);
    const bFlight = state.refreshTokenPromise;
    expect(mocks.fetchRefreshToken).toHaveBeenCalledTimes(2);
    finishes[0]({ error: null, data: { token: 'A-next', refreshToken: 'A-next-refresh' } });
    await expect(first).resolves.toBe(false);
    expect(state.refreshTokenPromise).toBe(bFlight);
    finishes[1]({ error: null, data: { token: 'B-next', refreshToken: 'B-next-refresh' } });
    await expect(second).resolves.toBe(true);
    expect(state.refreshTokenPromise).toBeNull();
    expect(storage.get('token')).toBe('B-next');
  });
});
