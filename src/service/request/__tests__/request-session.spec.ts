import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  storeRevision: 'A',
  resetStore: vi.fn(),
  refresh: vi.fn(),
  message: vi.fn(),
  userInfo: { isSystemAdmin: true }
}));
vi.mock('@/utils/storage', () => ({
  localStg: {
    get: (key: string) => mocks.storage.get(key) || null,
    set: (key: string, value: string) => mocks.storage.set(key, value),
    remove: (key: string) => mocks.storage.delete(key)
  }
}));
vi.mock('@/store/modules/auth', () => ({
  useAuthStore: () => ({
    get authSessionRevision() {
      return mocks.storeRevision;
    },
    resetStore: mocks.resetStore,
    userInfo: mocks.userInfo
  })
}));
vi.mock('@/service/api', () => ({ fetchRefreshToken: mocks.refresh }));
vi.mock('@/utils/service', () => ({
  getServiceBaseURL: () => ({ baseURL: 'http://isolated.invalid', otherBaseURL: { demo: 'http://isolated.invalid' } })
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

function changeIdentity(revision: string) {
  mocks.storeRevision = revision;
  mocks.storage.set('authSessionRevision', revision);
  mocks.storage.set('token', revision + '-access');
  mocks.storage.set('refreshToken', revision + '-refresh');
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => {
    resolve = accept;
  });
  return { promise, resolve };
}
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { config, data, status, statusText: 'isolated', headers: {} };
}

describe('actual request transport binds its originating auth session', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.storage.clear();
    changeIdentity('A');
    mocks.userInfo.isSystemAdmin = true;
    vi.stubEnv('VITE_SERVICE_SUCCESS_CODE', '200');
    vi.stubEnv('VITE_SERVICE_LOGOUT_CODES', '401');
    vi.stubEnv('VITE_SERVICE_MODAL_LOGOUT_CODES', '');
    vi.stubEnv('VITE_SERVICE_EXPIRED_TOKEN_CODES', '');
    window.$message = { error: mocks.message } as unknown as NonNullable<Window['$message']>;
    mocks.refresh.mockResolvedValue({ data: { token: 'B-refreshed', refreshToken: 'B-next' }, error: null });
  });
  it.each(['json', 'blob'] as const)('drops a late %s success after identity handoff', async kind => {
    const { request } = await import('../index');
    const started = deferred<void>();
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    const job = request({
      url: '/isolated',
      responseType: kind,
      adapter: input => {
        config = input;
        started.resolve();
        return pending.promise;
      }
    });
    await started.promise;
    changeIdentity('B');
    pending.resolve(
      response(config, kind === 'blob' ? new Blob(['A-private']) : { code: 200, data: { private: 'A' } })
    );
    const result = await job;
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(mocks.resetStore).not.toHaveBeenCalled();
    expect(mocks.message).not.toHaveBeenCalled();
  });
  it('does not dispatch an old payload when identity changes before the async interceptor', async () => {
    const { request } = await import('../index');
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { code: 200, data: 'old payload delivered' })
    );
    const job = request({ url: '/system/user', method: 'post', data: { nickname: 'A draft' }, adapter });
    changeIdentity('B');
    const result = await job;
    expect(adapter).not.toHaveBeenCalled();
    expect(result.error).toBeTruthy();
  });
  it('never refreshes B or replays A after an old 401 reaches the client', async () => {
    const { request } = await import('../index');
    const started = deferred<void>();
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    let calls = 0;
    const job = request({
      url: '/system/user',
      method: 'post',
      data: { nickname: 'A draft' },
      adapter: input => {
        calls++;
        if (calls > 1) return Promise.resolve(response(input, { code: 200, data: 'cross-session replay' }));
        config = input;
        started.resolve();
        return pending.promise;
      }
    });
    await started.promise;
    changeIdentity('B');
    pending.resolve(response(config, { code: 401, msg: 'expired A' }, 401));
    const result = await job;
    expect(result.data).toBeNull();
    expect(calls).toBe(1);
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.resetStore).not.toHaveBeenCalled();
  });
  it('does not apply a late forbidden response to the new system-admin capability', async () => {
    const { request } = await import('../index');
    const started = deferred<void>();
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    const job = request({
      url: '/system/mail/form',
      adapter: input => {
        config = input;
        started.resolve();
        return pending.promise;
      }
    });
    await started.promise;
    changeIdentity('B');
    pending.resolve(response(config, { code: 403, msg: 'old boundary', errorCode: 'SYSTEM_ADMIN_ONLY' }, 403));
    await job;
    expect(mocks.userInfo.isSystemAdmin).toBe(true);
    expect(mocks.message).not.toHaveBeenCalled();
    expect(mocks.resetStore).not.toHaveBeenCalled();
  });
  it('continues a legitimate same-session refresh exactly once', async () => {
    const { request } = await import('../index');
    let calls = 0;
    const authorizations: string[] = [];
    const result = await request({
      url: '/isolated',
      adapter: async config => {
        calls++;
        authorizations.push(String(config.headers.Authorization));
        return calls === 1
          ? response(config, { code: 401 }, 401)
          : response(config, { code: 200, data: 'current session' });
      }
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe('current session');
    expect(calls).toBe(2);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(authorizations).toEqual(['Bearer A-access', 'Bearer B-refreshed']);
  });
  it('guards the authenticated secondary transport before blob delivery', async () => {
    const { demoRequest } = await import('../index');
    const started = deferred<void>();
    const pending = deferred<AxiosResponse>();
    let config!: InternalAxiosRequestConfig;
    const job = demoRequest({
      url: '/isolated',
      responseType: 'blob',
      adapter: input => {
        config = input;
        started.resolve();
        return pending.promise;
      }
    });
    await started.promise;
    changeIdentity('B');
    pending.resolve(response(config, new Blob(['A-private'])));
    await expect(job).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });
  it('refuses requests from a stale tab before its storage event is processed', async () => {
    const { request } = await import('../index');
    mocks.storage.set('authSessionRevision', 'B');
    mocks.storage.set('token', 'B-access');
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, { code: 200, data: 'old UI payload' })
    );
    const result = await request({ url: '/system/user', method: 'post', adapter });
    expect(result.error).toBeTruthy();
    expect(adapter).not.toHaveBeenCalled();
  });
});
