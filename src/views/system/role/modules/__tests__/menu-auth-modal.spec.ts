import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const getPages = vi.fn();
const getTree = vi.fn();
const getChecks = vi.fn();
const updateMenus = vi.fn();

vi.mock('@/service/api', () => ({
  fetchGetAllPages: (...args: unknown[]) => getPages(...args),
  fetchGetMenuTree: (...args: unknown[]) => getTree(...args),
  fetchGetRoleMenuList: (...args: unknown[]) => getChecks(...args),
  fetchUpdateRoleMenu: (...args: unknown[]) => updateMenus(...args)
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

import MenuAuthModal from '../menu-auth-modal.vue';

const stubs = {
  NModal: { template: '<div><slot/><slot name="footer"/></div>' },
  NSpace: { template: '<div><slot/></div>' },
  NSpin: { template: '<div><slot/></div>' },
  NTree: true,
  NButton: { template: '<button @click="$emit(\'click\')"><slot/></button>' }
};

async function render() {
  const wrapper = mount(MenuAuthModal, {
    props: { roleId: 'role-1', visible: false },
    global: { stubs }
  });
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
}

describe('role menu authorization modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPages.mockResolvedValue({ data: ['home', 'system_user'], error: null });
    getTree.mockResolvedValue({
      data: [
        {
          id: 'root',
          label: 'Root',
          children: [
            { id: 'leaf-a', label: 'A', children: [] },
            { id: 'leaf-b', label: 'B', children: [] }
          ]
        }
      ],
      error: null
    });
    getChecks.mockResolvedValue({ data: ['leaf-a'], error: null });
    updateMenus.mockResolvedValue({ data: null, error: null });
    (window as any).$message = { success: vi.fn() };
  });

  it('preserves half-selected parents when submitting the complete menu set', async () => {
    const wrapper = await render();
    const vm = wrapper.vm as unknown as {
      checks: string[];
      indeterminateKeys: string[];
      pages: string[];
      home: string;
      handleSubmit: () => Promise<void>;
    };

    expect(vm.home).toBe('home');
    expect(vm.pages).toEqual(['home', 'system_user']);
    expect(vm.checks).toEqual(['leaf-a']);
    expect(vm.indeterminateKeys).toEqual(['root']);
    await vm.handleSubmit();

    expect(updateMenus).toHaveBeenCalledWith('role-1', ['leaf-a', 'root']);
    expect((window as any).$message.success).toHaveBeenCalled();
    expect(wrapper.emitted('update:visible')).toEqual([[false]]);
  });

  it('accepts tree-provided indeterminate keys and keeps the modal open on failure', async () => {
    updateMenus.mockResolvedValue({ data: null, error: new Error('denied') });
    const wrapper = await render();
    const vm = wrapper.vm as unknown as {
      handleIndeterminateKeysCheck: (keys: string[]) => void;
      handleSubmit: () => Promise<void>;
      indeterminateKeys: string[];
    };
    vm.handleIndeterminateKeysCheck(['manual-parent']);
    await vm.handleSubmit();

    expect(vm.indeterminateKeys).toEqual(['manual-parent']);
    expect(updateMenus).toHaveBeenCalledWith('role-1', ['leaf-a', 'manual-parent']);
    expect(wrapper.emitted('update:visible')).toBeUndefined();
  });

  it('fails closed when pages, tree, or checks cannot load', async () => {
    getPages.mockResolvedValue({ data: null, error: new Error('pages') });
    getTree.mockResolvedValue({ data: null, error: new Error('tree') });
    getChecks.mockResolvedValue({ data: null, error: new Error('checks') });
    const wrapper = await render();
    const vm = wrapper.vm as unknown as {
      pages: string[];
      tree: unknown[];
      checks: string[];
      showSpin: boolean;
    };

    expect(vm.pages).toEqual([]);
    expect(vm.tree).toEqual([]);
    expect(vm.checks).toEqual([]);
    expect(vm.showSpin).toBe(false);
  });
});
