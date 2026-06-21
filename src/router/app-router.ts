import type { RouteRecordRaw } from 'vue-router';

export const APP_ROUTE_PREFIX = '/app';

export function createAppRoutes(): RouteRecordRaw[] {
  return [
    {
      path: `${APP_ROUTE_PREFIX}/:slug/:pageKey`,
      name: 'app-lowcode',
      component: () => import('@/views/app/index.vue'),
      meta: {
        isAppRoute: true,
        title: '应用页面',
        constant: true
      }
    }
  ];
}

export function parseAppRoute(path: string): { slug: string; pageKey: string } | null {
  const match = path.match(/^\/app\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { slug: match[1], pageKey: match[2] };
}
