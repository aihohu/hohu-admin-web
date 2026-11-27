import { flushPromises, mount } from '@vue/test-utils';
import { NCheckboxGroup, NRadioGroup, NTree } from 'naive-ui';
import { describe, expect, it, vi } from 'vitest';
import UserListPermissions from '../user-list-permissions.vue';

const api = vi.hoisted(() => ({
  fetchGetRoleMenuList: vi.fn().mockResolvedValue({ data: ['users'] }),
  fetchGetMenuTree: vi
    .fn()
    .mockResolvedValue({ data: [{ id: 'system', label: 'System', children: [{ id: 'users', label: 'Users' }] }] })
}));
vi.mock('@/service/api', () => api);
vi.mock('@/locales', () => ({ $t: (key: string) => key, localizedText: (text: string) => text }));

const policy: Api.FieldManagement.ListPolicy = { mode: 'restrict_selected', read: [], query: [] };
const doc = {
  role: { roleId: '201' },
  listActionGranted: true,
  listMenuIds: ['users'],
  listFields: { read: ['nickname', 'user_name', 'user_phone'], query: ['nickname', 'user_name'] },
  copyFields: { read: ['user_name'], query: ['nickname'] },
  sensitiveFields: ['user_phone']
} as Api.FieldManagement.Document;

async function setup() {
  const page = mount(UserListPermissions, {
    attachTo: document.body,
    props: { document: doc, policy, disabled: false, canMenu: true }
  });
  await flushPromises();
  const button = (key: string) => page.findAll('button').find(b => b.text() === key)!;
  return { page, button };
}

describe('role menu and user list field controls', () => {
  it('opens the fields for the user-list node without granting a menu, and returns focus to that node', async () => {
    const { page, button } = await setup();
    try {
      expect(api.fetchGetRoleMenuList).toHaveBeenCalledWith('201');
      const tree = page.getComponent(NTree);
      expect(tree.text()).toContain('System');
      await tree.get('.n-tree-node-switcher').trigger('click');
      await flushPromises();
      const node = tree.get('button');
      await node.trigger('click');
      expect(document.activeElement).toBe(page.get('h3').element);
      await button('fieldPolicy.collapseFields').trigger('click');
      expect(document.activeElement).toBe(node.element);
      expect(page.emitted('change')).toBeUndefined();
      await button('common.edit').trigger('click');
      expect(page.emitted('menu')).toHaveLength(1);
    } finally {
      page.unmount();
    }
  });

  it('keeps ordinary and sensitive choices per purpose and starts an allow list from blank or a copy', async () => {
    const { page, button } = await setup();
    try {
      await button('fieldPolicy.title').trigger('click');
      await button('fieldPolicy.allow_selected').trigger('click');
      await button('common.cancel').trigger('click');
      expect(page.emitted('change')).toBeUndefined();
      await button('fieldPolicy.allow_selected').trigger('click');
      await button('fieldPolicy.copyEffective').trigger('click');
      expect(page.emitted('change')!.at(-1)).toEqual([{ mode: 'allow_selected', ...doc.copyFields }]);
      await button('fieldPolicy.allow_selected').trigger('click');
      await button('fieldPolicy.startBlank').trigger('click');
      expect(page.emitted('change')!.at(-1)).toEqual([{ mode: 'allow_selected', read: [], query: [] }]);
      page.findAllComponents(NCheckboxGroup)[1].vm.$emit('update:value', ['user_phone']);
      expect(page.emitted('change')!.at(-1)).toEqual([{ ...policy, sensitive: { read: ['user_phone'], query: [] } }]);
      page.getComponent(NRadioGroup).vm.$emit('update:value', 'query');
      await flushPromises();
      page.getComponent(NCheckboxGroup).vm.$emit('update:value', ['user_name', 'nickname']);
      expect(page.emitted('change')!.at(-1)).toEqual([{ ...policy, query: ['nickname', 'user_name'] }]);
      const count = page.emitted('change')!.length;
      await page.setProps({ disabled: true, canMenu: false });
      page.getComponent(NCheckboxGroup).vm.$emit('update:value', []);
      expect(page.emitted('change')).toHaveLength(count);
      expect(page.findComponent(NTree).exists()).toBe(false);
    } finally {
      page.unmount();
    }
  });
});
