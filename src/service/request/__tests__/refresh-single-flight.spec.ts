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
