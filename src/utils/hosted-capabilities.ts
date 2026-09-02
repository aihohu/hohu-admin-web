import type { TenantMode } from './tenant-auth';

type CapabilityRoute = {
  name: string;
  path: string;
  children?: CapabilityRoute[];
};

/** Marketplace and Lowcode stay unavailable in the first hosted release. */
export function isMarketplaceCapabilityAvailable(mode: TenantMode | undefined = import.meta.env.VITE_TENANT_MODE) {
  return mode === undefined || mode === 'single';
}

function isMarketplaceOrLowcodeRoute(route: CapabilityRoute) {
  return (
    route.name === 'app-lowcode' ||
    route.name === 'marketplace' ||
    route.name.startsWith('marketplace-') ||
    route.path === '/app' ||
    route.path.startsWith('/app/') ||
    route.path === '/marketplace' ||
    route.path.startsWith('/marketplace/') ||
    route.path === '/marketplace-review' ||
    route.path.startsWith('/marketplace-review/')
  );
}

/** Remove contained routes before Vue Router and sidebar menus are built. */
export function filterHostedCapabilityRoutes<T extends CapabilityRoute>(
  routes: readonly T[],
  mode: TenantMode | undefined = import.meta.env.VITE_TENANT_MODE
): T[] {
  if (isMarketplaceCapabilityAvailable(mode)) return [...routes];

  const filteredRoutes: T[] = [];

  routes.forEach(route => {
    if (isMarketplaceOrLowcodeRoute(route)) return;
    if (!route.children) {
      filteredRoutes.push(route);
      return;
    }

    const children = filterHostedCapabilityRoutes(route.children, mode);
    if (children.length === 0) return;

    filteredRoutes.push({ ...route, children } as T);
  });

  return filteredRoutes;
}

function containsRouteName(routes: readonly CapabilityRoute[], routeName: string): boolean {
  return routes.some(
    route => route.name === routeName || (route.children ? containsRouteName(route.children, routeName) : false)
  );
}

function findFirstLeafRouteName(routes: readonly CapabilityRoute[]): string | undefined {
  for (const route of routes) {
    if (!route.children?.length) return route.name;

    const childName = findFirstLeafRouteName(route.children);
    if (childName) return childName;
  }

  return undefined;
}

/** Keep the dynamic root redirect on an actually registered route in hosted mode. */
export function resolveHostedCapabilityHome<T extends CapabilityRoute>(
  routes: readonly T[],
  requestedHome: string,
  fallbackHome: string | undefined,
  mode: TenantMode | undefined = import.meta.env.VITE_TENANT_MODE
): string | undefined {
  if (isMarketplaceCapabilityAvailable(mode)) return requestedHome;

  const availableRoutes = filterHostedCapabilityRoutes(routes, mode);
  if (containsRouteName(availableRoutes, requestedHome)) return requestedHome;
  if (fallbackHome && containsRouteName(availableRoutes, fallbackHome)) return fallbackHome;

  return findFirstLeafRouteName(availableRoutes);
}
