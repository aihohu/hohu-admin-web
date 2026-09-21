import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/service/api', () => ({
  fetchGetConstantRoutes: vi.fn().mockResolvedValue({
    data: [
      {
        name: '403',
        path: '/403',
        component: 'layout.blank$view.403',
        meta: { title: '403', constant: true }
      }
    ],
    error: null
  }),
  fetchGetUserRoutes: vi.fn(),
  fetchIsRouteExist: vi.fn()
}));
vi.mock('@/router', () => ({
  router: { addRoute: vi.fn(), removeRoute: vi.fn(), push: vi.fn(), replace: vi.fn() }
}));
vi.mock('@/router/routes', () => ({
  createStaticRoutes: vi.fn(() => []),
  getAuthVueRoutes: vi.fn(routes => routes)
}));
vi.mock('../../auth', () => ({
  useAuthStore: vi.fn(() => ({
    isStaticSuper: false,
    userInfo: { isSystemAdmin: false, roles: [] },
    initUserInfo: vi.fn()
  }))
}));
vi.mock('../../contributes', () => ({
  useContributesStore: vi.fn(() => ({ canViewContribute: false, clear: vi.fn(), addItems: vi.fn() }))
}));
vi.mock('../../tab', () => ({
  useTabStore: vi.fn(() => ({
    cacheTabs: vi.fn(),
    updateTabsByRoute: vi.fn(),
    initHomeTab: vi.fn(),
    setActiveRouteTab: vi.fn()
  }))
}));

import { fetchGetUserRoutes } from '@/service/api';
import { useRouteStore } from '..';

function mockUserRoutes(routes: unknown[], home: string) {
  vi.mocked(fetchGetUserRoutes).mockResolvedValue({
    data: { routes, home },
    error: null
  } as never);
}

describe('zero accessible routes lands on the constant empty page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('falls back to routeHome=empty when the user has no auth routes', async () => {
    mockUserRoutes([], 'ai_chat');
    const store = useRouteStore();

    await store.initAuthRoute();

    expect(store.routeHome).toBe('empty');
    expect(store.isInitAuthRoute).toBe(true);
  });

  it('falls back to the first visible auth route, never a constant page', async () => {
    // e2eview01-like user: no AI menu, but system_user is bound. The legacy
    // merged [constantRoutes, authRoutes] lookup picked the constant 403.
    mockUserRoutes(
      [
        {
          name: 'auth',
          path: '/auth',
          component: 'layout.base',
          meta: { title: 'auth' },
          children: [
            { name: 'system_user', path: '/system/user', component: 'view.system_user', meta: { title: 'system_user' } }
          ]
        }
      ],
      'ai_chat'
    );
    const store = useRouteStore();

    await store.initAuthRoute();

    expect(store.routeHome).toBe('system_user');
  });

  it('keeps the requested ai_chat home when auth routes exist', async () => {
    mockUserRoutes(
      [{ name: 'ai_chat', path: '/ai/chat', component: 'view.ai_chat', meta: { title: 'ai_chat' } }],
      'ai_chat'
    );
    const store = useRouteStore();

    await store.initAuthRoute();

    expect(store.routeHome).toBe('ai_chat');
  });
});
