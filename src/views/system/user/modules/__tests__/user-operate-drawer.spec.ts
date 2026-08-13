import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import UserOperateDrawer from '../user-operate-drawer.vue';

const formMocks = vi.hoisted(() => ({
  validate: vi.fn()
}));

vi.mock('@/service/api', () => ({
  fetchGetAllRoles: vi.fn().mockResolvedValue({ error: null, data: [] }),
  fetchGetDeptTreeOption: vi.fn().mockResolvedValue({ error: null, data: [] }),
  fetchSaveUser: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'saved' } } }),
  fetchUpdateUser: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'updated' } } })
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

async function mountDrawer() {
  const wrapper = mount(UserOperateDrawer, {
    props: { visible: false, operateType: 'add' },
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
  });

  it('创建用户名规则与后端一致，且角色为必填项', async () => {
    const wrapper = await mountDrawer();
    const vm = wrapper.vm as unknown as {
      rules: Record<string, App.Global.FormRule[]>;
    };
    const userNamePattern = vm.rules.userName.find(rule => rule.pattern)?.pattern as RegExp;

    expect(userNamePattern.test('测试1')).toBe(true);
    expect(userNamePattern.test('qa_e2e_004')).toBe(false);
    expect(vm.rules.roles.some(rule => rule.required)).toBe(true);
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
      roles: ['user']
    });

    await vm.handleSubmit();

    expect(fetchSaveUser).toHaveBeenCalledTimes(1);
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
});
