import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ProviderOperateDrawer from '../modules/provider-operate-drawer.vue';

const persistedModel = {
  modelId: '201',
  providerId: '101',
  name: 'safe-model',
  capabilities: ['text'],
  baseUrl: null,
  isEnabled: true,
  sortOrder: 0,
  config: null,
  createBy: null,
  createTime: '',
  egressStatus: 'EGRESS_POLICY_BLOCKED'
} satisfies Api.Ai.AiModel;

vi.mock('@/service/api', () => ({
  fetchAddProviderModel: vi.fn(),
  fetchDeleteProviderModel: vi.fn(),
  fetchGetProviderModels: vi.fn().mockResolvedValue({
    data: [
      {
        modelId: '201',
        providerId: '101',
        name: 'safe-model',
        capabilities: ['text'],
        baseUrl: null,
        isEnabled: true,
        sortOrder: 0,
        config: null,
        createBy: null,
        createTime: '',
        egressStatus: 'EGRESS_POLICY_BLOCKED'
      }
    ],
    error: null
  }),
  fetchSaveProvider: vi.fn(),
  fetchTestProviderModel: vi.fn().mockResolvedValue({ data: { status: 'ok' }, error: null }),
  fetchUpdateProvider: vi.fn(),
  fetchUpdateProviderModel: vi.fn()
}));

vi.mock('@/hooks/common/form', () => ({
  useFormRules: () => ({ defaultRequiredRule: {} }),
  useNaiveForm: () => ({
    formRef: { value: null },
    validate: vi.fn(),
    restoreValidation: vi.fn()
  })
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const stubs = {
  NAlert: { template: '<div><slot /></div>' },
  NButton: true,
  NCard: true,
  NCheckbox: true,
  NCheckboxGroup: true,
  NDivider: true,
  NDrawer: { template: '<div><slot /></div>' },
  NDrawerContent: { template: '<div><slot /><slot name="footer" /></div>' },
  NForm: true,
  NFormItem: true,
  NInput: true,
  NInputNumber: true,
  NPopconfirm: true,
  NSpace: true,
  NSpin: { template: '<div><slot /></div>' },
  NSwitch: true,
  NTag: { template: '<span><slot /></span>' },
  NTooltip: true
};

describe('Provider operate drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tests only the persisted Provider and model IDs and exposes quarantine state', async () => {
    const { fetchTestProviderModel } = await import('@/service/api');
    const wrapper = mount(ProviderOperateDrawer, {
      props: {
        visible: false,
        operateType: 'edit',
        rowData: {
          providerId: '101',
          providerCode: 'openai',
          name: 'OpenAI',
          apiKey: '****',
          baseUrl: null,
          isEnabled: true,
          config: null,
          createTime: '',
          updateTime: '',
          egressStatus: 'EGRESS_POLICY_BLOCKED'
        }
      },
      global: { stubs }
    });

    await wrapper.setProps({ visible: true });
    await flushPromises();
    const vm = wrapper.vm as unknown as { handleTestModel: (model: Api.Ai.AiModel) => Promise<void> };
    await vm.handleTestModel(persistedModel);

    expect(fetchTestProviderModel).toHaveBeenCalledWith('101', '201');
    expect(wrapper.text()).toContain('page.ai.provider.egressPolicyBlocked');
  });

  it('requires unsaved Provider edits to be saved before testing a persisted model', async () => {
    const { fetchTestProviderModel } = await import('@/service/api');
    const wrapper = mount(ProviderOperateDrawer, {
      props: {
        visible: false,
        operateType: 'edit',
        rowData: {
          providerId: '101',
          providerCode: 'openai',
          name: 'OpenAI',
          apiKey: '****',
          baseUrl: 'https://saved.example.com',
          isEnabled: true,
          config: null,
          createTime: '',
          updateTime: '',
          egressStatus: null
        }
      },
      global: { stubs }
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      model: Api.Ai.ProviderCreateParams;
      providerFormDirty: boolean;
      handleTestModel: (model: Api.Ai.AiModel) => Promise<void>;
    };
    vm.model.baseUrl = 'https://unsaved.example.com';
    await wrapper.vm.$nextTick();

    await vm.handleTestModel(persistedModel);

    expect(vm.providerFormDirty).toBe(true);
    expect(wrapper.text()).toContain('page.ai.provider.saveBeforeTest');
    expect(fetchTestProviderModel).not.toHaveBeenCalled();
  });
});
