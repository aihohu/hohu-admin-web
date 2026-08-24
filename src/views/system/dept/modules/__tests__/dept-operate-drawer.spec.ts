import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import DeptOperateDrawer from '../dept-operate-drawer.vue';

const serviceMocks = vi.hoisted(() => ({
  fetchGetDeptTreeOption: vi.fn(),
  fetchSaveDept: vi.fn(),
  fetchUpdateDept: vi.fn()
}));

vi.mock('@/service/api', () => serviceMocks);

vi.mock('@/hooks/common/form', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/common/form')>();
  return {
    ...original,
    useNaiveForm: () => ({
      formRef: ref(null),
      validate: vi.fn(),
      restoreValidation: vi.fn()
    })
  };
});

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

const NTreeSelectStub = defineComponent({
  name: 'NTreeSelect',
  props: {
    disabled: Boolean
  },
  template: '<div data-testid="parent-select" />'
});

const stubs = {
  NDrawer: { template: '<div><slot /></div>' },
  NDrawerContent: { template: '<div><slot /><slot name="footer" /></div>' },
  NForm: { template: '<form><slot /></form>' },
  NFormItem: { template: '<div><slot /></div>' },
  NTreeSelect: NTreeSelectStub,
  NInput: true,
  NInputNumber: true,
  NRadioGroup: { template: '<div><slot /></div>' },
  NRadio: true,
  NButton: true,
  NSpace: { template: '<div><slot /></div>' }
};

const row = {
  deptId: '200',
  parentId: '100',
  ancestors: '0,100',
  deptName: 'Engineering',
  orderNum: 1,
  leader: null,
  phone: null,
  email: null,
  status: '1'
} as Api.SystemManage.Dept;

describe('dept-operate-drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.fetchGetDeptTreeOption.mockResolvedValue({ error: null, data: [] });
    serviceMocks.fetchSaveDept.mockResolvedValue({
      error: null,
      response: { data: { msg: 'saved' } }
    });
    serviceMocks.fetchUpdateDept.mockResolvedValue({
      error: null,
      response: { data: { msg: 'updated' } }
    });
  });

  it('keeps hierarchy read-only and omits parentId from base updates', async () => {
    const wrapper = mount(DeptOperateDrawer, {
      props: { visible: false, operateType: 'edit', rowData: row },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as {
      model: Api.SystemManage.DeptCreateParams;
      handleSubmit: () => Promise<void>;
    };
    vm.model.parentId = '999';
    await vm.handleSubmit();

    expect(wrapper.findComponent(NTreeSelectStub).props('disabled')).toBe(true);
    expect(serviceMocks.fetchUpdateDept).toHaveBeenCalledWith('200', {
      deptName: 'Engineering',
      orderNum: 1,
      leader: null,
      phone: null,
      email: null,
      status: '1'
    });
  });
});
