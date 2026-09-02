import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TenantMode } from '../tenant-auth';
import {
  filterHostedCapabilityRoutes,
  isMarketplaceCapabilityAvailable,
  resolveHostedCapabilityHome
} from '../hosted-capabilities';

describe('hosted Marketplace and Lowcode containment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the existing single-mode routes available', () => {
    expect(isMarketplaceCapabilityAvailable(undefined)).toBe(true);
    expect(isMarketplaceCapabilityAvailable('single')).toBe(true);
  });

  it('removes Marketplace and Lowcode routes recursively in hosted mode', () => {
    const routes = [
      { name: 'dashboard', path: '/dashboard' },
      { name: 'marketplace', path: '/marketplace' },
      {
        name: 'system',
        path: '/system',
        children: [
          { name: 'system-user', path: '/system/user' },
          { name: 'marketplace-review', path: '/marketplace-review' }
        ]
      }
    ];

    expect(filterHostedCapabilityRoutes(routes, 'hosted')).toEqual([
      { name: 'dashboard', path: '/dashboard' },
      {
        name: 'system',
        path: '/system',
        children: [{ name: 'system-user', path: '/system/user' }]
      }
    ]);
    expect(isMarketplaceCapabilityAvailable('hosted')).toBe(false);
  });

  it('fails closed for an unsupported runtime tenant mode', () => {
    expect(isMarketplaceCapabilityAvailable('unexpected-mode' as TenantMode)).toBe(false);
  });

  it('prunes empty route groups after their contained children are removed', () => {
    const routes = [
      {
        name: 'apps',
        path: '/apps',
        children: [{ name: 'marketplace-upload', path: '/marketplace/upload' }]
      },
      { name: 'dashboard', path: '/dashboard' }
    ];

    expect(filterHostedCapabilityRoutes(routes, 'hosted')).toEqual([{ name: 'dashboard', path: '/dashboard' }]);
  });

  it('replaces a contained dynamic home without reviving the hidden route', () => {
    const routes = [
      { name: 'dashboard', path: '/dashboard' },
      { name: 'marketplace', path: '/marketplace' }
    ];

    expect(resolveHostedCapabilityHome(routes, 'marketplace', 'dashboard', 'hosted')).toBe('dashboard');
    expect(resolveHostedCapabilityHome(routes, 'marketplace', 'missing', 'hosted')).toBe('dashboard');
    expect(resolveHostedCapabilityHome(routes, 'marketplace', 'dashboard', 'single')).toBe('marketplace');
  });
});
