import { describe, expect, it } from 'vitest';
import type { CustomRoute, ElegantConstRoute } from '@elegant-router/types';
import { getAuthVueRoutes } from '../../routes';
import { getRoutePath } from '../transform';
import { resolveHostedCapabilityHome } from '@/utils/hosted-capabilities';
import { layouts, views } from '../imports';

/** 动态路由的一级单页判定按 component 形状，而非 route name 是否含下划线。 */
describe('single-level route detection by component shape', () => {
  it('keeps an underscored top-level layout$view route as a single-level page', () => {
    const routes: ElegantConstRoute[] = [
      {
        name: 'ai_chat',
        path: '/ai/chat',
        component: 'layout.base$view.ai_chat',
        meta: { title: 'AI 助手' }
      }
    ];

    const [vueRoute] = getAuthVueRoutes(routes as unknown as CustomRoute[]);

    expect(vueRoute.component).toBe(layouts.base);
    expect(vueRoute.children?.[0]?.component).toBe(views.ai_chat);
  });

  it('treats a plain view component without underscore as a nested child page', () => {
    const routes: ElegantConstRoute[] = [
      {
        name: 'system',
        path: '/system',
        component: 'layout.base',
        meta: { title: '系统管理' },
        children: [
          {
            name: 'dashboard',
            path: '/dashboard',
            component: 'view.dashboard',
            meta: { title: '仪表盘' }
          }
        ]
      }
    ];

    const [vueRoute] = getAuthVueRoutes(routes as unknown as CustomRoute[]);

    expect(vueRoute.children?.[0]?.component).toBe(views.dashboard);
  });

  it('keeps the only authorized legacy home usable without granting AI access', () => {
    const routes = [{ name: 'home', path: '/home', component: 'layout.base$view.home', meta: { title: '首页' } }];
    const [route] = getAuthVueRoutes(routes as unknown as ElegantConstRoute[]);
    expect(route?.children?.[0]?.name).toBe('home');
    expect(route?.children?.[0]?.component).toBeTruthy();
    expect(getRoutePath('home' as Parameters<typeof getRoutePath>[0])).toBe('/home');
    expect(resolveHostedCapabilityHome(routes, 'ai_chat', 'ai_chat')).toBe('home');
    expect(routes.map(item => item.name)).not.toContain('ai_chat');
  });
});
