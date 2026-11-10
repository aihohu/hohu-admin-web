import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import DictTypeDrawer from '../dict-type-operate-drawer.vue';
import DictDataDrawer from '../dict-data-operate-drawer.vue';
import DictDataSearch from '../dict-data-search.vue';

const api = vi.hoisted(() => ({
  fetchSaveDictType: vi.fn(),
  fetchUpdateDictType: vi.fn(),
  fetchSaveDictData: vi.fn(),
  fetchUpdateDictData: vi.fn(),
  fetchGetAllDictTypes: vi.fn()
}));
vi.mock('@/service/api', () => api);
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/hooks/business/auth', () => ({ useAuth: () => ({ hasAuth: () => false }) }));
vi.mock('@/hooks/common/form', () => ({
  useNaiveForm: () => ({ formRef: ref(null), validate: vi.fn(), restoreValidation: vi.fn() }),
  useFormRules: () => ({ defaultRequiredRule: { required: true } })
}));
const Input = defineComponent({
  name: 'NInput',
  props: ['value', 'disabled'],
  emits: ['update:value'],
  template: '<input :disabled="disabled" />'
});
const slot = { template: '<div><slot /><slot name="footer" /></div>' };
const stubs = Object.fromEntries(
  [
    'NDrawer',
    'NDrawerContent',
    'NForm',
    'NFormItem',
    'NFormItemGi',
    'NGrid',
    'NSpace',
    'NCard',
    'NCollapse',
    'NCollapseItem'
  ].map(key => [key, slot])
);
const global = {
  stubs: { ...stubs, NInput: Input, NButton: true, NRadioGroup: true, NRadio: true, NSelect: true, NInputNumber: true }
};

describe('ordinary drawers and search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(api).forEach(fn => fn.mockResolvedValue({ error: null, data: [] }));
  });
  it('allows an authorized rename and submits only that explicit field', async () => {
    const wrapper = mount(DictTypeDrawer, {
      global,
      props: {
        visible: false,
        operateType: 'edit',
        rowData: {
          dictTypeId: '9007199254740997',
          dictName: 'kept',
          dictType: 'old',
          fieldPolicy: { update: ['dict_type'] }
        }
      }
    });
    await wrapper.setProps({ visible: true });
    const input = wrapper.findComponent(Input);
    expect(wrapper.findAllComponents(Input)).toHaveLength(1);
    expect(input.props('disabled')).not.toBe(true);
    input.vm.$emit('update:value', 'new');
    await flushPromises();
    await (wrapper.vm as unknown as { handleSubmit(): Promise<void> }).handleSubmit();
    expect(api.fetchUpdateDictType).toHaveBeenCalledWith('9007199254740997', { dictType: 'new' });
  });
  it('allows an explicit write-only item edit without sending defaults or anchors', async () => {
    const wrapper = mount(DictDataDrawer, {
      global,
      props: {
        visible: false,
        operateType: 'edit',
        rowData: { dictCode: '99', fieldPolicy: { update: ['dict_value'] } }
      }
    });
    await wrapper.setProps({ visible: true });
    expect(wrapper.findAllComponents(Input)).toHaveLength(1);
    wrapper.findComponent(Input).vm.$emit('update:value', 'replacement');
    await flushPromises();
    await (wrapper.vm as unknown as { handleSubmit(): Promise<void> }).handleSubmit();
    expect(api.fetchUpdateDictData).toHaveBeenCalledWith('99', { dictValue: 'replacement' });
  });
  it('never requests dictionary-type options for hidden or unauthorized filters', async () => {
    const wrapper = mount(DictDataSearch, { global, props: { model: { current: 1, size: 10 } } });
    await flushPromises();
    expect(api.fetchGetAllDictTypes).not.toHaveBeenCalled();
    await wrapper.setProps({ allowedFields: ['dict_type'] });
    await flushPromises();
    expect(api.fetchGetAllDictTypes).not.toHaveBeenCalled();
    expect(wrapper.findComponent(Input).exists()).toBe(true);
  });
});
