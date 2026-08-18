import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import UserOperateDrawer from '../user-operate-drawer.vue';

const formMocks = vi.hoisted(() => ({
  validate: vi.fn()
}));

const permissions = vi.hoisted(() => new Set<string>());

vi.mock('@/service/api', () => ({
  fetchGetAllRoles: vi.fn().mockResolvedValue({ error: null, data: [] }),
  fetchGetAssignableRoles: vi.fn().mockResolvedValue({
    error: null,
    data: [{ roleId: '100', roleCode: 'R_USER', roleName: 'User', dataScope: '5' }]
  }),
  fetchGetDeptTreeOption: vi.fn().mockResolvedValue({ error: null, data: [] }),
  fetchSaveUser: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'saved' } } }),
  fetchUpdateUser: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'updated' } } }),
  fetchUpdateUserRoles: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'roles updated' } } }),
  fetchUpdateUserDepartments: vi.fn().mockResolvedValue({
    error: null,
    response: { data: { msg: 'departments updated' } }
  })
}));

vi.mock('@/hooks/business/auth', () => ({
  useAuth: () => ({ hasAuth: (code: string) => permissions.has(code) })
}));

vi.mock('@/hooks/common/form', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/common/form')>();
  return {
    ...original,
    useNaiveForm: () => ({
      formRef: ref(null),
      validate: formMocks.validate,
      restoreValidation: vi.fn()
    })
  };
});

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

const stubs = {
  NDrawer: { template: '<div><slot /></div>' },
  NDrawerContent: { template: '<div><slot /><slot name="footer" /></div>' },
  NForm: { template: '<form><slot /></form>' },
  NFormItem: { template: '<div><slot /></div>' },
  NInput: true,
  NRadioGroup: { template: '<div><slot /></div>' },
  NRadio: true,
  NSelect: true,
  NTree: true,
  NButton: true,
  NSpace: { template: '<div><slot /></div>' }
};

async function mountDrawer(
  operateType: NaiveUI.TableOperateType = 'add',
  rowData: Api.SystemManage.User | null = null
) {
  const wrapper = mount(UserOperateDrawer, {
    props: { visible: false, operateType, rowData },
    global: { stubs }
  });
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
}

describe('user-operate-drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formMocks.validate.mockResolvedValue(undefined);
    permissions.clear();
    permissions.add('system:user:role-auth');
    permissions.add('system:dept:list');
  });

  it('创建用户名规则与后端一致，且角色为必填项', async () => {
    const wrapper = await mountDrawer();
    const vm = wrapper.vm as unknown as {
      rules: Record<string, App.Global.FormRule[]>;
    };
    const userNamePattern = vm.rules.userName.find(rule => rule.pattern)?.pattern as RegExp;

    expect(userNamePattern.test('测试1')).toBe(true);
    expect(userNamePattern.test('qa_e2e_004')).toBe(false);
    expect(vm.rules.roleIds.some(rule => rule.required)).toBe(true);
  });

  it('创建成功后关闭抽屉并通知列表刷新', async () => {
    const { fetchSaveUser } = await import('@/service/api');
    const wrapper = await mountDrawer();
    const vm = wrapper.vm as unknown as {
      model: Api.SystemManage.CreateUserParams;
      handleSubmit: () => Promise<void>;
    };
    Object.assign(vm.model, {
      userName: 'qae2e004',
      nickname: 'E2E测试4',
      password: 'Hohu123456',
      roleIds: ['100']
    });

    await vm.handleSubmit();

    expect(fetchSaveUser).toHaveBeenCalledTimes(1);
    expect(fetchSaveUser).toHaveBeenCalledWith(expect.objectContaining({ roleIds: ['100'], deptIds: [] }));
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
    expect(wrapper.emitted('submitted')).toHaveLength(1);
  });

  it('handles validation rejection without submitting or leaking an unhandled promise', async () => {
    const { fetchSaveUser } = await import('@/service/api');
    formMocks.validate.mockRejectedValueOnce([{ message: 'invalid' }]);
    const wrapper = await mountDrawer();
    const vm = wrapper.vm as unknown as {
      handleSubmit: () => Promise<void>;
    };

    await expect(vm.handleSubmit()).resolves.toBeUndefined();

    expect(fetchSaveUser).not.toHaveBeenCalled();
  });

  it('omits explicit roles and department lookup for add-only users', async () => {
    permissions.clear();
    const { fetchGetAssignableRoles, fetchGetDeptTreeOption, fetchSaveUser } = await import('@/service/api');
    const wrapper = await mountDrawer();
    const vm = wrapper.vm as unknown as {
      model: Api.SystemManage.CreateUserParams;
      handleSubmit: () => Promise<void>;
    };
    Object.assign(vm.model, {
      userName: 'qaminimal',
      nickname: 'Minimal user',
      password: 'Hohu123456'
    });

    await vm.handleSubmit();

    expect(fetchGetAssignableRoles).not.toHaveBeenCalled();
    expect(fetchGetDeptTreeOption).not.toHaveBeenCalled();
    expect(fetchSaveUser).toHaveBeenCalledWith(expect.not.objectContaining({ roleIds: expect.anything() }));
  });

  it('uses independent profile, role, and department writers when editing', async () => {
    const { fetchUpdateUser, fetchUpdateUserDepartments, fetchUpdateUserRoles } = await import('@/service/api');
    const row = {
      userId: '200',
      userName: 'alice',
      nickname: 'Alice',
      userGender: '1',
      userPhone: '13800000000',
      userEmail: 'alice@example.com',
      status: '1',
      roles: [],
      roleNames: [],
      deptIds: [],
      deptNames: '',
      primaryDept: null,
      userDepts: []
    } as unknown as Api.SystemManage.User;
    const wrapper = await mountDrawer('edit', row);
    const vm = wrapper.vm as unknown as {
      model: { roleIds: string[] };
      checkedDeptKeys: string[];
      primaryDeptId: string;
      handleSubmit: () => Promise<void>;
    };
    vm.model.roleIds = ['100'];
    vm.checkedDeptKeys = ['300'];
    vm.primaryDeptId = '300';

    await vm.handleSubmit();

    expect(fetchUpdateUserRoles).toHaveBeenCalledWith('200', { roleIds: ['100'] });
    expect(fetchUpdateUserDepartments).toHaveBeenCalledWith('200', {
      deptAssignments: [{ deptId: '300', isPrimary: true }]
    });
    expect(fetchUpdateUser).toHaveBeenCalledWith(
      '200',
      expect.not.objectContaining({
        password: expect.anything(),
        roleIds: expect.anything(),
        deptIds: expect.anything()
      })
    );
  });

  it('does not rewrite unchanged role or department associations during a profile edit', async () => {
    const { fetchUpdateUser, fetchUpdateUserDepartments, fetchUpdateUserRoles } = await import('@/service/api');
    const row = {
      userId: '201',
      userName: 'bob',
      nickname: 'Bob',
      userGender: '1',
      userPhone: '',
      userEmail: '',
      status: '1',
      roles: ['R_USER'],
      roleNames: ['User'],
      deptIds: ['301'],
      deptNames: 'Sales',
      primaryDept: '301',
      userDepts: [{ deptId: '301', isPrimary: true }]
    } as unknown as Api.SystemManage.User;
    const wrapper = await mountDrawer('edit', row);
    const vm = wrapper.vm as unknown as { handleSubmit: () => Promise<void> };

    await vm.handleSubmit();

    expect(fetchUpdateUserRoles).not.toHaveBeenCalled();
    expect(fetchUpdateUserDepartments).not.toHaveBeenCalled();
    expect(fetchUpdateUser).toHaveBeenCalledOnce();
  });

  it('closes and reloads after a later writer fails following a committed role update', async () => {
    const { fetchUpdateUser, fetchUpdateUserDepartments, fetchUpdateUserRoles } = await import('@/service/api');
    vi.mocked(fetchUpdateUserRoles).mockResolvedValueOnce({
      error: null,
      response: { data: { msg: 'roles updated' } }
    } as Awaited<ReturnType<typeof fetchUpdateUserRoles>>);
    vi.mocked(fetchUpdateUserDepartments).mockResolvedValueOnce({
      error: new Error('departments failed'),
      data: null
    } as Awaited<ReturnType<typeof fetchUpdateUserDepartments>>);
    const row = {
      userId: '202',
      userName: 'carol',
      nickname: 'Carol',
      userGender: '1',
      userPhone: '',
      userEmail: '',
      status: '1',
      roles: [],
      roleNames: [],
      deptIds: [],
      deptNames: '',
      primaryDept: null,
      userDepts: []
    } as unknown as Api.SystemManage.User;
    const wrapper = await mountDrawer('edit', row);
    const vm = wrapper.vm as unknown as {
      model: { roleIds: string[] };
      checkedDeptKeys: string[];
      primaryDeptId: string;
      handleSubmit: () => Promise<void>;
    };
    vm.model.roleIds = ['100'];
    vm.checkedDeptKeys = ['300'];
    vm.primaryDeptId = '300';

    await vm.handleSubmit();

    expect(fetchUpdateUserRoles).toHaveBeenCalledOnce();
    expect(fetchUpdateUserDepartments).toHaveBeenCalledOnce();
    expect(fetchUpdateUser).not.toHaveBeenCalled();
    expect(wrapper.emitted('submitted')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
  });
});
