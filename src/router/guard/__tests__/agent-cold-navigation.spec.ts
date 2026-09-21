import { expect, it, vi } from 'vitest';

vi.mock('@/router/guard', () => ({ createRouterGuard: vi.fn() }));
vi.mock('@/router/app-router', () => ({ createAppRoutes: () => [] }));
vi.mock('@/router/routes/builtin', () => ({
  createBuiltinVueRoutes: () => [
    { name: 'platform', path: '/platform', component: {} },
    { name: 'not-found', path: '/:pathMatch(.*)*', component: {} }
  ]
}));

it('cold Agent navigation reaches route initialization instead of redirecting back to platform', async () => {
  vi.stubEnv('VITE_ROUTER_HISTORY_MODE', 'memory');
  const { router } = await import('@/router');
  router.beforeEach(to => {
    if (to.name === 'platform') return '/ai/agent';
    if (to.name === 'not-found') {
      router.addRoute({ name: 'ai_agent', path: '/ai/agent', component: {} });
      return to.fullPath;
    }
    return undefined;
  });
  // An unconditional legacy redirect runs before guards and creates a loop.
  expect(router.resolve('/ai/agent').matched.some(route => Boolean(route.redirect))).toBe(false);
  await router.push('/platform');
  expect(router.currentRoute.value.name).toBe('ai_agent');
  vi.unstubAllEnvs();
});
