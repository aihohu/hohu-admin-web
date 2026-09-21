import type { CustomRoute, ElegantConstRoute } from '@elegant-router/types';
import { layouts, views } from '../elegant/imports';
import { getRoutePath } from '../elegant/transform';
import { transformAppRoutes } from './transform';

export const ROOT_ROUTE: CustomRoute = {
  name: 'root',
  path: '/',
  redirect: getRoutePath(import.meta.env.VITE_ROUTE_HOME) || '/home',
  meta: {
    title: 'root',
    constant: true
  }
};

const NOT_FOUND_ROUTE: CustomRoute = {
  name: 'not-found',
  path: '/:pathMatch(.*)*',
  component: 'layout.blank$view.404',
  meta: {
    title: 'not-found',
    constant: true
  }
};

/** builtin routes, it must be constant and setup in vue-router */
const builtinRoutes: ElegantConstRoute[] = [
  ROOT_ROUTE,
  NOT_FOUND_ROUTE,
  {
    name: 'platform',
    path: '/platform',
    component: 'layout.blank$view.platform',
    meta: { title: 'platform', constant: true, hideInMenu: true, i18nKey: 'platform.title' }
  }
];

/** create builtin vue routes */
export function createBuiltinVueRoutes() {
  return transformAppRoutes(builtinRoutes, layouts, views);
}
