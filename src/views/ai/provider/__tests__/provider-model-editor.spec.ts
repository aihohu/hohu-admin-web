import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import * as naive from 'naive-ui';
import messages from '@/locales/locale';
import ProviderOperateDrawer from '../modules/provider-operate-drawer.vue';

vi.mock('@/service/api', () => ({
  fetchSaveProvider: vi.fn(),
  fetchUpdateProvider: vi.fn(),
  fetchGetProviderModels: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchAddProviderModel: vi.fn(),
  fetchUpdateProviderModel: vi.fn(),
  fetchDeleteProviderModel: vi.fn(),
  fetchTestProviderModel: vi.fn()
}));

const wrappers: VueWrapper[] = [];

function createEditor(operateType: 'add' | 'edit' = 'add') {
  const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages });
  const wrapper = mount(ProviderOperateDrawer, {
    attachTo: document.body,
    props: {
      visible: false,
      operateType,
      rowData:
        operateType === 'edit'
          ? {
              providerId: '101',
              providerCode: 'openai',
              name: 'OpenAI',
              credentialConfigured: true,
              baseUrl: null,
              isEnabled: true,
              config: null,
              createTime: '',
              egressStatus: null
            }
          : null
    },
    global: {
      plugins: [i18n],
      components: {
        NForm: naive.NForm,
        NFormItem: naive.NFormItem,
        NInput: naive.NInput,
        NInputNumber: naive.NInputNumber,
        NButton: naive.NButton,
        NSwitch: naive.NSwitch,
        NSpace: naive.NSpace,
        NCard: naive.NCard,
        NCheckbox: naive.NCheckbox,
        NCheckboxGroup: naive.NCheckboxGroup,
        NCollapse: naive.NCollapse,
        NCollapseItem: naive.NCollapseItem,
        NDivider: naive.NDivider,
        NAlert: naive.NAlert,
        NSpin: naive.NSpin,
        NTag: naive.NTag,
        NTooltip: naive.NTooltip,
        NPopconfirm: naive.NPopconfirm
      },
      stubs: {
        NDrawer: { template: '<aside><slot /></aside>' },
        NDrawerContent: { template: '<section><slot /><footer><slot name="footer" /></footer></section>' },
        IconIcRoundAdd: true,
        IconIcRoundClose: true,
        IconIcRoundDelete: true,
        IconIcRoundEdit: true,
        IconIcRoundPlayArrow: true
      },
      directives: { permission: () => undefined }
    }
  });
  wrappers.push(wrapper);
  return { wrapper, i18n };
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()));

describe('model editor interactions', () => {
  it('blocks configuration submission while a model is unfinished and stages it only after validation', async () => {
    const { fetchSaveProvider, fetchAddProviderModel } = await import('@/service/api');
    const { wrapper } = createEditor();
    await wrapper.setProps({ visible: true });
    await wrapper.get('.models-list > button').trigger('click');

    expect(wrapper.get('footer .n-button--primary-type').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('请先完成或取消模型编辑');
    await wrapper.get('.model-form .n-card__action .n-button--primary-type').trigger('click');
    await flushPromises();
    expect(wrapper.find('.model-form').exists()).toBe(true);
    expect(fetchSaveProvider).not.toHaveBeenCalled();
    expect(fetchAddProviderModel).not.toHaveBeenCalled();

    await wrapper.get('.model-form .n-input input').setValue('gpt-4o');
    await wrapper.get('.model-form .n-card__action .n-button--primary-type').trigger('click');
    await flushPromises();

    expect(wrapper.find('.model-form').exists()).toBe(false);
    expect(wrapper.text()).toContain('gpt-4o');
    expect(wrapper.get('footer .n-button--primary-type').attributes('disabled')).toBeUndefined();
    expect(fetchAddProviderModel).not.toHaveBeenCalled();
  });

  it('switches capability and action labels without reopening the editor', async () => {
    const { wrapper, i18n } = createEditor();
    await wrapper.setProps({ visible: true });
    await wrapper.get('.models-list > button').trigger('click');
    expect(wrapper.get('.model-form .n-checkbox-group').text()).toContain('图片生成');
    expect(wrapper.get('.model-form .n-card__action .n-button--primary-type').text()).toBe('加入模型列表');

    i18n.global.locale.value = 'en-US';
    await wrapper.vm.$nextTick();

    const capabilities = wrapper.get('.model-form .n-checkbox-group').text();
    expect(capabilities).toContain('Image Gen');
    expect(capabilities).toContain('Embedding');
    expect(capabilities).not.toContain('图片生成');
    expect(wrapper.get('.model-form .n-card__action .n-button--primary-type').text()).toBe('Add to model list');
    expect(wrapper.get('footer .n-button--primary-type').text()).toBe('Create configuration');
  });

  it('cancels model editing without staging a model or submitting configuration', async () => {
    const { fetchSaveProvider } = await import('@/service/api');
    const { wrapper } = createEditor();
    await wrapper.setProps({ visible: true });
    await wrapper.get('.models-list > button').trigger('click');
    await wrapper.get('.model-form .n-input input').setValue('discarded-model');
    await wrapper.get('.model-form .n-card__action .n-button--default-type').trigger('click');

    expect(wrapper.find('.model-form').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('discarded-model');
    expect(wrapper.get('footer .n-button--primary-type').attributes('disabled')).toBeUndefined();
    expect(fetchSaveProvider).not.toHaveBeenCalled();
  });

  it('preserves the model form on API failure and prevents duplicate saves while a request is pending', async () => {
    const { fetchAddProviderModel } = await import('@/service/api');
    const { wrapper } = createEditor('edit');
    await wrapper.setProps({ visible: true });
    await flushPromises();
    await wrapper.get('.models-list > button').trigger('click');
    await wrapper.get('.model-form .n-input input').setValue('retry-model');
    let finishRequest!: (value: Awaited<ReturnType<typeof fetchAddProviderModel>>) => void;
    vi.mocked(fetchAddProviderModel).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishRequest = resolve;
        })
    );

    await wrapper.get('.model-form .n-card__action .n-button--primary-type').trigger('click');
    await flushPromises();
    expect(wrapper.get('.model-form .n-card__action .n-button--default-type').attributes('disabled')).toBeDefined();
    await wrapper.get('.model-form .n-card__action .n-button--primary-type').trigger('click');
    expect(fetchAddProviderModel).toHaveBeenCalledTimes(1);

    finishRequest({ data: null, error: new Error('save failed') } as never);
    await flushPromises();
    expect(wrapper.find('.model-form').exists()).toBe(true);
    expect((wrapper.get('.model-form .n-input input').element as HTMLInputElement).value).toBe('retry-model');

    vi.mocked(fetchAddProviderModel).mockResolvedValueOnce({ data: null, error: null } as never);
    await wrapper.get('.model-form .n-card__action .n-button--primary-type').trigger('click');
    await flushPromises();
    expect(wrapper.find('.model-form').exists()).toBe(false);
    expect(wrapper.get('footer .n-button--primary-type').text()).toBe('保存配置');
  });
});
