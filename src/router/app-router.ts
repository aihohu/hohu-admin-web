import type { RouteRecordRaw } from 'vue-router';
import BaseLayout from '@/layouts/base-layout/index.vue';

export const APP_ROUTE_PREFIX = '/app';

export function createAppRoutes(): RouteRecordRaw[] {
  return [
    {
      // Wrap app pages in BaseLayout so the sidebar/header persist across
      // navigation. Without this, /app/... renders bare and users lose all
      // surrounding chrome (no way back to other modules).
      path: APP_ROUTE_PREFIX,
      component: BaseLayout,
      children: [
        {
          path: ':slug/:pageKey',
          name: 'app-lowcode',
          component: () => import('@/views/app/index.vue'),
          meta: {
            isAppRoute: true,
            title: '应用页面'
          }
        }
      ]
    }
  ];
}

export function parseAppRoute(path: string): { slug: string; pageKey: string } | null {
  const match = path.match(/^\/app\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { slug: match[1], pageKey: match[2] };
}
