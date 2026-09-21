import type { RouteComponent, RouteRecordRaw } from 'vue-router';
import type { ElegantConstRoute } from '@elegant-router/types';

type Components = Record<string, RouteComponent | (() => Promise<RouteComponent>)>;

/** Application-owned conversion: dynamic menu hierarchy is independent of route-name spelling. */
export function transformAppRoutes(
  routes: ElegantConstRoute[],
  layouts: Components,
  views: Components
): RouteRecordRaw[] {
  function resolve(component: string) {
    const isLayout = component.startsWith('layout.');
    const prefix = isLayout ? 'layout.' : 'view.';
    const value = (isLayout ? layouts : views)[component.slice(prefix.length)];
    if (!component.startsWith(prefix) || !value) throw new Error(`Unknown route component: ${component}`);
    return value;
  }

  function convert(route: ElegantConstRoute): RouteRecordRaw[] {
    const { name, path, component, children, ...rest } = route;
    const props = route.props ?? (path.includes(':') ? true : undefined);
    try {
      if (component?.includes('$')) {
        const [layout, view] = component.split('$');
        return [
          {
            path,
            component: resolve(layout),
            meta: { title: route.meta?.title || '' },
            children: [{ name, path: '', component: resolve(view), ...rest, props } as RouteRecordRaw]
          }
        ];
      }

      const result = { name, path, ...rest, props } as RouteRecordRaw;
      if (component) result.component = resolve(component);
      const nested = children?.flatMap(convert) || [];
      if (nested.length) {
        result.redirect ||= { name: children![0].name };
        // Keep elegant-router's flattening for named nested directories.
        if (name.includes('_')) return [result, ...nested];
        result.children = nested;
      }
      return [result];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error transforming route "${name}": ${String(error)}`);
      return [];
    }
  }

  return routes.flatMap(convert);
}
