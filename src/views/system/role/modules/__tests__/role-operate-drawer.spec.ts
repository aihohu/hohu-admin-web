import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import RoleOperateDrawer from '../role-operate-drawer.vue';

const mocks = vi.hoisted(() => ({
  deptTreeOptions: [
    {
      id: '100',
      label: '研发中心',
      pId: '0',
      children: [{ id: '101', label: '前端组', pId: '100' }]
    }
  ] as Api.SystemManage.DeptTreeOption[]
}));

vi.mock('@/service/api', () => ({
  fetchGetDeptTreeOption: vi.fn().mockResolvedValue({ error: null, data: mocks.deptTreeOptions }),
  fetchSaveRole: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'saved' } } }),
  fetchUpdateRole: vi.fn().mockResolvedValue({ error: null, response: { data: { msg: 'updated' } } })
}));

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

const NTreeStub = defineComponent({
  name: 'NTree',
  props: {
    data: { type: Array, required: true },
    keyField: { type: String, required: true },
    labelField: { type: String, required: true }
  },
  template: '<div data-testid="dept-tree" />'
});

const stubs = {
  NDrawer: { template: '<div><slot /></div>' },
  NDrawerContent: { template: '<div><slot /><slot name="footer" /></div>' },
  NForm: { template: '<form><slot /></form>' },
  NFormItem: { template: '<div><slot /></div>' },
  NInput: true,
  NRadioGroup: { template: '<div><slot /></div>' },
  NRadio: true,
  NSelect: true,
  NTree: NTreeStub,
  NButton: true,
  NSpace: { template: '<div><slot /></div>' }
};

describe('role-operate-drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('自定义数据权限使用可显示部门名称的树选项', async () => {
    const { fetchGetDeptTreeOption } = await import('@/service/api');
    const wrapper = mount(RoleOperateDrawer, {
      props: { visible: false, operateType: 'add' },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();

    const vm = wrapper.vm as unknown as { model: { dataScope: string } };
    vm.model.dataScope = '2';
    await wrapper.vm.$nextTick();

    const tree = wrapper.findComponent(NTreeStub);
    expect(fetchGetDeptTreeOption).toHaveBeenCalledTimes(1);
    expect(tree.props('data')).toEqual(mocks.deptTreeOptions);
    expect(tree.props('keyField')).toBe('id');
    expect(tree.props('labelField')).toBe('label');
  });
});
