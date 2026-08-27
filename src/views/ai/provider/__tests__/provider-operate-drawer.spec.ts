import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ProviderOperateDrawer from '../modules/provider-operate-drawer.vue';

const formHarness = vi.hoisted(() => ({
  validate: vi.fn(),
  restoreValidation: vi.fn()
}));

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
    validate: formHarness.validate,
    restoreValidation: formHarness.restoreValidation
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
  NTooltip: true,
  IconIcRoundAdd: true,
  IconIcRoundClose: true,
  IconIcRoundDelete: true,
  IconIcRoundEdit: true,
  IconIcRoundPlayArrow: true
};

describe('Provider operate drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formHarness.validate.mockResolvedValue(undefined);
    window.$message = {
      success: vi.fn(),
      warning: vi.fn()
    } as unknown as typeof window.$message;
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

  it('covers add-mode pending models and submits the provider before its models', async () => {
    const { fetchAddProviderModel, fetchSaveProvider } = await import('@/service/api');
    vi.mocked(fetchSaveProvider).mockResolvedValueOnce({
      data: {
        providerId: '301',
        providerCode: 'openai',
        name: 'OpenAI',
        apiKey: '****',
        baseUrl: null,
        isEnabled: true,
        config: null,
        createTime: '',
        updateTime: '',
        egressStatus: null
      },
      error: null
    } as never);
    vi.mocked(fetchAddProviderModel).mockResolvedValue({ data: persistedModel, error: null } as never);
    const wrapper = mount(ProviderOperateDrawer, {
      props: { visible: false, operateType: 'add' },
      global: { stubs }
    });
    await wrapper.setProps({ visible: true });
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;

    state.openAddModel();
    state.newModel.name = 'first-model';
    await state.saveModel();
    state.openAddModel();
    state.newModel.name = 'removed-model';
    await state.saveModel();
    state.removePendingModel(1);
    await state.handleSubmit();

    expect(fetchSaveProvider).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: true }));
    expect(fetchAddProviderModel).toHaveBeenCalledWith('301', expect.objectContaining({ name: 'first-model' }));
    expect(wrapper.emitted('submitted')).toHaveLength(1);
    expect(wrapper.emitted('update:visible')?.at(-1)).toEqual([false]);
  });

  it('covers model edit, create, delete, validation failure, and API error branches', async () => {
    const {
      fetchAddProviderModel,
      fetchDeleteProviderModel,
      fetchGetProviderModels,
      fetchTestProviderModel,
      fetchUpdateProviderModel
    } = await import('@/service/api');
    vi.mocked(fetchUpdateProviderModel).mockResolvedValueOnce({ data: persistedModel, error: null } as never);
    vi.mocked(fetchAddProviderModel).mockResolvedValueOnce({ data: persistedModel, error: null } as never);
    vi.mocked(fetchDeleteProviderModel).mockResolvedValueOnce({ data: null, error: null } as never);
    vi.mocked(fetchGetProviderModels).mockResolvedValue({ data: [persistedModel], error: null } as never);
    vi.mocked(fetchTestProviderModel).mockResolvedValueOnce({ data: { status: 'ok' }, error: null } as never);
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
          egressStatus: null
        }
      },
      global: { stubs, directives: { permission: () => undefined } }
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;

    state.openEditModel(persistedModel);
    state.newModel.name = 'updated-model';
    await state.saveModel();
    state.openAddModel();
    state.newModel.name = 'added-model';
    await state.saveModel();
    await state.deleteModel(persistedModel);
    await state.handleTestModel(persistedModel);

    expect(fetchUpdateProviderModel).toHaveBeenCalledWith(
      '101',
      '201',
      expect.objectContaining({ name: 'updated-model' })
    );
    expect(fetchAddProviderModel).toHaveBeenCalledWith('101', expect.objectContaining({ name: 'added-model' }));
    expect(fetchDeleteProviderModel).toHaveBeenCalledWith('101', '201');
    expect(fetchTestProviderModel).toHaveBeenCalledWith('101', '201');

    state.modelFormRef = { validate: vi.fn().mockRejectedValueOnce(new Error('invalid')) };
    state.openAddModel();
    await state.saveModel();
    expect(state.showModelForm).toBe(true);

    vi.mocked(fetchDeleteProviderModel).mockResolvedValueOnce({ data: null, error: new Error('delete') } as never);
    vi.mocked(fetchTestProviderModel).mockResolvedValueOnce({ data: null, error: new Error('test') } as never);
    await state.deleteModel(persistedModel);
    await state.handleTestModel(persistedModel);
  });

  it('covers edit submission success and failure without closing on error', async () => {
    const { fetchUpdateProvider } = await import('@/service/api');
    vi.mocked(fetchUpdateProvider)
      .mockResolvedValueOnce({ data: null, error: new Error('update') } as never)
      .mockResolvedValueOnce({ data: null, error: null } as never);
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
          egressStatus: null
        }
      },
      global: { stubs }
    });
    await wrapper.setProps({ visible: true });
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;

    await state.handleSubmit();
    expect(wrapper.emitted('submitted')).toBeUndefined();
    await state.handleSubmit();
    expect(wrapper.emitted('submitted')).toHaveLength(1);
    expect(fetchUpdateProvider).toHaveBeenCalledTimes(2);
  });
});
