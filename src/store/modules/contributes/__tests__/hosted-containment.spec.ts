import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAppContributes } from '@/service/api/lowcode';
import { useContributesStore } from '..';

vi.mock('@/service/api/lowcode', () => ({
  fetchAppContributes: vi.fn()
}));

describe('hosted contributes containment', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(fetchAppContributes).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not request or retain Lowcode contributes in hosted mode', async () => {
    vi.stubEnv('VITE_TENANT_MODE', 'hosted');
    const store = useContributesStore();
    store.menus.push({
      app_slug: 'legacy',
      app_name: 'Legacy',
      title: 'Legacy',
      icon: null,
      parent: null,
      order: 1,
      page_key: null
    });

    await store.fetchContributes();

    expect(fetchAppContributes).not.toHaveBeenCalled();
    expect(store.menus).toEqual([]);
    expect(store.pages).toEqual([]);
    expect(store.loaded).toBe(false);
  });
});
