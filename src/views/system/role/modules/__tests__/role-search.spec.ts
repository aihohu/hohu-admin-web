import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, reactive } from 'vue';
import RoleSearch from '../role-search.vue';

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

const NSelectStub = defineComponent({
  name: 'NSelect',
  inheritAttrs: false,
  props: {
    value: { type: String, default: null },
    options: { type: Array, required: true }
  },
  emits: ['update:value'],
  template:
    '<select v-bind="$attrs" :value="value" @change="$emit(\'update:value\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>'
});

const stubs = {
  NCard: { template: '<div><slot /></div>' },
  NCollapse: { template: '<div><slot /></div>' },
  NCollapseItem: { template: '<div><slot /></div>' },
  NForm: { template: '<form><slot /></form>' },
  NGrid: { template: '<div><slot /></div>' },
  NFormItemGi: { inheritAttrs: false, template: '<div v-bind="$attrs"><slot /></div>' },
  NInput: true,
  NSelect: NSelectStub,
  NSpace: { template: '<div><slot /></div>' },
  NButton: { template: '<button><slot /><slot name="icon" /></button>' },
  IconIcRoundRefresh: true,
  IconIcRoundSearch: true
};

describe('role-search', () => {
  it('搜索标签使用顶部布局，不依赖中英文字符宽度', () => {
    const model = reactive<Api.SystemManage.RoleSearchParams>({
      current: 1,
      size: 10,
      roleName: null,
      roleCode: null,
      status: null,
      dataScope: null
    });
    const wrapper = mount(RoleSearch, {
      props: { model },
      global: { stubs }
    });

    const form = wrapper.find('form');
    expect(form.attributes('label-placement')).toBe('top');
    expect(form.attributes('label-width')).toBeUndefined();
  });

  it('桌面端筛选项和操作按钮合计占满一行', () => {
    const model = reactive<Api.SystemManage.RoleSearchParams>({
      current: 1,
      size: 10,
      roleName: null,
      roleCode: null,
      status: null,
      dataScope: null
    });
    const wrapper = mount(RoleSearch, {
      props: { model },
      global: { stubs }
    });

    expect(wrapper.find('[data-testid="role-search-actions"]').attributes('span')).toBe('24 s:12 m:6 l:4');
  });

  it('提供五种数据权限筛选项并写回 dataScope 查询条件', async () => {
    const model = reactive<Api.SystemManage.RoleSearchParams>({
      current: 1,
      size: 10,
      roleName: null,
      roleCode: null,
      status: null,
      dataScope: null
    });
    const wrapper = mount(RoleSearch, {
      props: { model },
      global: { stubs }
    });

    const select = wrapper.find('[data-testid="role-data-scope-search"]');
    const dataScopeSelect = wrapper
      .findAllComponents(NSelectStub)
      .find(component => component.attributes('data-testid') === 'role-data-scope-search');
    const options = dataScopeSelect?.props('options') as Array<{ label: string; value: string }>;

    expect(options).toHaveLength(5);
    expect(options.map(option => option.value)).toEqual(['1', '2', '3', '4', '5']);
    await select.setValue('2');
    expect(model.dataScope).toBe('2');
  });
});
