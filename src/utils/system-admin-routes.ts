type ScopedRoute = { name: string; children?: ScopedRoute[] };

/** The tenant R_SUPER role must not expose the global Agent editor. */
export function filterSystemAdminRoutes<T extends ScopedRoute>(routes: T[], isSystemAdmin: boolean): T[] {
  return routes
    .filter(route => isSystemAdmin || !['ai_agent', 'tenant'].includes(route.name))
    .map(route => ({
      ...route,
      ...(route.children ? { children: filterSystemAdminRoutes(route.children, isSystemAdmin) } : {})
    }));
}
