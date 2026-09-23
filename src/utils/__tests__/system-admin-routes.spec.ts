import { expect, it } from 'vitest';
import { filterSystemAdminRoutes } from '../system-admin-routes';

it('filters the global Agent menu for tenants without changing source routes', () => {
  const routes = [{ name: 'ai', children: [{ name: 'ai_chat' }, { name: 'ai_agent' }] }];
  expect(filterSystemAdminRoutes(routes, false)[0].children).toEqual([{ name: 'ai_chat' }]);
  expect(filterSystemAdminRoutes(routes, true)).toEqual(routes);
  expect(routes[0].children).toHaveLength(2);
});
it('hides tenant management from tenant administrators', () => {
  const routes = [{ name: 'tenant' }, { name: 'home' }];
  expect(filterSystemAdminRoutes(routes, false)).toEqual([{ name: 'home' }]);
  expect(filterSystemAdminRoutes(routes, true)).toEqual(routes);
});
