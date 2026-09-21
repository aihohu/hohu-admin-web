import { expect, it, vi } from 'vitest';
import type { Router, RouteLocationNormalized } from 'vue-router';
const stores = vi.hoisted(() => ({ auth: vi.fn(), routes: vi.fn() }));
vi.mock('@/store/modules/auth', () => ({ useAuthStore: stores.auth }));
vi.mock('@/store/modules/route', () => ({ useRouteStore: stores.routes }));
vi.mock('@/utils/storage', () => ({ localStg: { get: () => 'existing-token' } }));
import { createRouteGuard } from '../route';

it('redirects the legacy platform URL into normal session and role checks', async () => {
  let guard: (to: RouteLocationNormalized, from: RouteLocationNormalized) => unknown = () => undefined;
  const router = {
    beforeEach: vi.fn(fn => {
      guard = fn;
    })
  };
  createRouteGuard(router as unknown as Router);
  const route = { name: 'platform', meta: { constant: true } } as unknown as RouteLocationNormalized;
  expect(await guard(route, route)).toEqual({ path: '/ai/agent', replace: true });
  expect(stores.auth).not.toHaveBeenCalled();
  expect(stores.routes).not.toHaveBeenCalled();
});

it('denies direct Agent paths even when permission filtering removed their route name', async () => {
  stores.auth.mockReturnValue({ userInfo: { isSystemAdmin: false, roles: [] } });
  stores.routes.mockReturnValue({
    isInitConstantRoute: true,
    isInitAuthRoute: true,
    onRouteSwitchWhenLoggedIn: vi.fn(),
    getIsAuthRouteExist: vi.fn().mockResolvedValue(false)
  });
  let guard: (to: RouteLocationNormalized, from: RouteLocationNormalized) => unknown = () => undefined;
  createRouteGuard({
    beforeEach: (fn: typeof guard) => {
      guard = fn;
    }
  } as unknown as Router);
  const route = { name: 'not-found', path: '/ai/agent', fullPath: '/ai/agent', meta: {} } as RouteLocationNormalized;
  expect(await guard(route, route)).toEqual({ name: '403' });
});
