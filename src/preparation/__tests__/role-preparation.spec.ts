import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import labels from '@/locales/langs/field-policy-zh-cn.json';

const client = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  finish: vi.fn(),
  dispose: vi.fn(),
  repository: { roles: vi.fn() }
}));
vi.mock('@/service/request/policy-preparation', () => ({ createPreparationClient: () => client }));
vi.mock('@/views/system/role/modules/field-policy-drawer.vue', () => ({
  default: {
    props: ['roleId', 'visible', 'identity', 'repository'],
    template: '<div class="test-drawer" :data-role="roleId" />'
  }
}));
vi.mock('naive-ui', async importOriginal => ({
  ...(await importOriginal<typeof import('naive-ui')>()),
  useDialog: () => ({ warning: vi.fn() })
}));
vi.mock('@/locales', async () => {
  const data = (await import('@/locales/langs/field-policy-zh-cn.json')).default as Record<string, string>;
  return {
    $t: (key: string) =>
      key.startsWith('fieldPolicy.')
        ? data[key.slice(12)]
        : (
            {
              'page.system.role.roleName': '角色名称',
              'page.system.role.roleCode': '角色编码',
              'common.operate': '操作',
              'common.edit': '编辑',
              'common.delete': '删除'
            } as Record<string, string>
          )[key] || key
  };
});
import RolePreparation from '../role-preparation.vue';

describe('sparse role anchors in the actual preparation page', () => {
  const wrappers: ReturnType<typeof mount>[] = [];
  beforeEach(() => {
    vi.clearAllMocks();
    client.login.mockResolvedValue({ tenantId: '0', actorId: '101', expiresIn: 900 });
    client.logout.mockResolvedValue(undefined);
  });
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  });
  async function login(records: Api.FieldManagement.Role[]) {
    client.repository.roles.mockResolvedValue({ records, nextCursor: null });
    const wrapper = mount(RolePreparation);
    wrappers.push(wrapper);
    await wrapper.get(`input[aria-label="${labels.user_name}"]`).setValue('isolated-admin');
    await wrapper.get(`input[aria-label="${labels.password}"]`).setValue('isolated-password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    return wrapper;
  }
  it('shows distinct ID-only targets and opens the selected second role', async () => {
    const wrapper = await login([{ roleId: '9007199254741001' }, { roleId: '9007199254741002' }]);
    expect(wrapper.text()).toContain('9007199254741001');
    expect(wrapper.text()).toContain('9007199254741002');
    const headings = wrapper.findAll('th').map(cell => cell.text());
    expect(headings).toContain(labels.roleAnchor);
    expect(headings).not.toContain('角色名称');
    expect(headings).not.toContain('角色编码');
    const row = wrapper.findAll('tbody tr').find(item => item.text().includes('9007199254741002'))!;
    const field = row.findAll('button').find(item => item.text() === labels.title)!;
    await field.trigger('click');
    expect(wrapper.get('.test-drawer').attributes('data-role')).toBe('9007199254741002');
    const menu = row.findAll('button').find(item => item.text().includes('page.system.role.menuAuth'))!;
    expect(menu.attributes('disabled')).toBeDefined();
  });
  it.each(['roleName', 'roleCode'] as const)('adds only the actually provided %s column', async field => {
    const wrapper = await login([{ roleId: '1001', [field]: 'visible-label' }, { roleId: '1002' }]);
    const headings = wrapper.findAll('th').map(cell => cell.text());
    expect(headings).toContain(labels.roleAnchor);
    expect(headings).toContain(field === 'roleName' ? '角色名称' : '角色编码');
    expect(headings).not.toContain(field === 'roleName' ? '角色编码' : '角色名称');
    expect(wrapper.text()).toContain('visible-label');
  });
});
