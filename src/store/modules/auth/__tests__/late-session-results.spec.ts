import { createPinia, disposePinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  login: vi.fn(),
  info: vi.fn(),
  reset: vi.fn(),
  runtime: vi.fn(),
  aiReset: vi.fn(),
  routeReset: vi.fn()
}));
vi.mock('@/utils/storage', () => ({
  localStg: {
    get: (key: string) => mocks.storage.get(key) || null,
    set: (key: string, value: string) => mocks.storage.set(key, value),
    remove: (key: string) => mocks.storage.delete(key)
  }
}));
vi.mock('@/service/api', () => ({ fetchLogin: mocks.login, fetchGetUserInfo: mocks.info }));
vi.mock('vue-router', () => ({ useRoute: () => ({ meta: { constant: true } }) }));
vi.mock('@/hooks/common/router', () => ({
  useRouterPush: () => ({
    toLogin: vi.fn().mockResolvedValue(undefined),
    redirectFromLogin: vi.fn().mockResolvedValue(undefined)
  })
}));
vi.mock('@/store/modules/ai', () => ({ useAiStore: () => ({ resetStore: mocks.aiReset }) }));
vi.mock('@/store/modules/route', () => ({ useRouteStore: () => ({ resetStore: mocks.routeReset }) }));
vi.mock('@/store/modules/tab', () => ({ useTabStore: () => ({ cacheTabs: vi.fn(), clearTabs: vi.fn() }) }));
vi.mock('@/store/modules/app', () => ({ useAppStore: () => ({ applyDefaultLocale: vi.fn() }) }));
vi.mock('@/utils/runtime-settings', () => ({ clearRuntimeSettings: vi.fn(), refreshRuntimeSettings: mocks.runtime }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
import { useAuthStore } from '../index';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => {
    resolve = accept;
  });
  return { promise, resolve };
}
function externalIdentityB() {
  mocks.storage.set('authSessionRevision', 'B');
  mocks.storage.set('token', 'B-access');
  mocks.storage.set('refreshToken', 'B-refresh');
}
describe('auth store does not consume late work from a superseded tab session', () => {
  let pinia: ReturnType<typeof createPinia>;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storage.clear();
    mocks.storage.set('authSessionRevision', 'A');
    mocks.storage.set('token', 'A-access');
    mocks.storage.set('refreshToken', 'A-refresh');
    mocks.runtime.mockResolvedValue(null);
    mocks.routeReset.mockResolvedValue(undefined);
    pinia = createPinia();
    setActivePinia(pinia);
  });
  afterEach(() => disposePinia(pinia));
  function store() {
    const auth = useAuthStore();
    auth.$reset = mocks.reset;
    return auth;
  }
  it('keeps B credentials when an old login attempt fails', async () => {
    const pending = deferred<{ data: null; error: Error }>();
    mocks.login.mockReturnValue(pending.promise);
    const auth = store();
    const job = auth.login('isolated-A', 'isolated-password', false);
    externalIdentityB();
    pending.resolve({ data: null, error: new Error('old login failed') });
    await job;
    expect(mocks.storage.get('token')).toBe('B-access');
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('does not log out B when old initialization fails', async () => {
    const pending = deferred<{ data: null; error: Error }>();
    mocks.info.mockReturnValue(pending.promise);
    const auth = store();
    const job = auth.initUserInfo();
    externalIdentityB();
    pending.resolve({ data: null, error: new Error('old info failed') });
    await job;
    expect(mocks.storage.get('refreshToken')).toBe('B-refresh');
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('does not hydrate old actor data after external identity handoff', async () => {
    const pending = deferred<{ data: Api.Auth.UserInfo; error: null }>();
    mocks.info.mockReturnValue(pending.promise);
    const auth = store();
    const job = auth.initUserInfo();
    externalIdentityB();
    pending.resolve({
      data: {
        userId: '101',
        userName: 'actor-A',
        userAvatar: '',
        isSystemAdmin: true,
        roles: ['R_SUPER'],
        buttons: []
      },
      error: null
    });
    await job;
    expect(auth.userInfo.userId).toBe('');
    expect(mocks.runtime).not.toHaveBeenCalled();
    expect(mocks.storage.get('token')).toBe('B-access');
  });
  it('can log out B while the previous session reset is still restoring routes', async () => {
    const firstRoute = deferred<void>();
    const nextRoute = deferred<void>();
    mocks.routeReset.mockReturnValueOnce(firstRoute.promise).mockReturnValueOnce(nextRoute.promise);
    const auth = store();
    const first = auth.resetStore();
    mocks.login.mockResolvedValue({ data: { token: 'B-access', refreshToken: 'B-refresh' }, error: null });
    mocks.info.mockResolvedValue({
      data: { userId: '202', userName: 'actor-B', userAvatar: '', isSystemAdmin: false, roles: [], buttons: [] },
      error: null
    });
    await auth.login('isolated-B', 'isolated-password', false);
    expect(mocks.storage.get('token')).toBe('B-access');
    const second = auth.resetStore();
    try {
      expect(mocks.storage.get('token')).toBeUndefined();
      expect(mocks.routeReset).toHaveBeenCalledTimes(2);
      expect(second).not.toBe(first);
    } finally {
      firstRoute.resolve();
      nextRoute.resolve();
      await Promise.all([first, second]);
    }
  });
});
