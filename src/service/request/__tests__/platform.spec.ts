import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const hooks = vi.hoisted(() => ({ value: {} as Record<string, Function> }));
vi.mock('@sa/axios', () => ({
  createFlatRequest: (_config: unknown, options: Record<string, Function>) => {
    hooks.value = options;
    return vi.fn();
  }
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
import { usePlatformStore } from '@/store/modules/platform';
import '../platform';

beforeEach(() => {
  sessionStorage.clear();
  setActivePinia(createPinia());
});

it('uses only the platform session and clears only it on rejection', () => {
  const store = usePlatformStore();
  localStorage.setItem('token', 'tenant-token');
  store.setToken('platform-token');
  const config = hooks.value.onRequest({ url: '/platform/ai/agents', headers: {} });
  expect(config.headers.Authorization).toBe('Bearer platform-token');
  hooks.value.onError({ response: { status: 401, data: { errorCode: 'PLATFORM_TOKEN_INVALID' }, config } });
  expect(store.token).toBe('');
  expect(localStorage.getItem('token')).toBe('tenant-token');
});

it('does not attach either session to platform login', () => {
  usePlatformStore().setToken('platform-token');
  const config = hooks.value.onRequest({ url: '/platform/auth/login', headers: {} });
  expect(config.headers.Authorization).toBeUndefined();
});

it('discards an old response after changing platform identity', () => {
  const store = usePlatformStore();
  store.setToken('old');
  const config = hooks.value.onRequest({ url: '/platform/ai/agents', headers: {} });
  store.setToken('new');
  expect(() => hooks.value.transform({ config, data: { data: ['private'] } })).toThrow();
  hooks.value.onError({ response: { status: 401, config, data: {} } });
  expect(store.token).toBe('new');
});
