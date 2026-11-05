import { flushPromises, shallowMount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import Profile from '../index.vue';
import { fetchGetUserProfile, fetchUpdateUserProfile } from '@/service/api';

vi.mock('../email-binding.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/service/api', () => ({
  fetchGetUserProfile: vi.fn(),
  fetchUpdateUserProfile: vi.fn(),
  fetchChangePassword: vi.fn(),
  fetchUploadFile: vi.fn()
}));
vi.mock('@/store/modules/auth', () => ({ useAuthStore: () => ({ resetStore: vi.fn() }) }));
vi.mock('@/hooks/common/router', () => ({ useRouterPush: () => ({ toLogin: vi.fn() }) }));
vi.mock('@/hooks/common/form', () => ({
  useFormRules: () => ({}),
  useNaiveForm: () => ({ formRef: ref(null), validate: vi.fn(), restoreValidation: vi.fn() })
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

describe('own profile field presence', () => {
  it('omits untouched masked values and allows explicit phone clearing', async () => {
    vi.mocked(fetchGetUserProfile).mockResolvedValue({
      data: {
        userId: '1',
        nickname: 'Alice',
        userPhone: '138****1234',
        userGender: '1',
        fieldAccess: {
          nickname: { read: 'plain', update: false },
          userPhone: { read: 'masked', update: true },
          userGender: { read: 'plain', update: true }
        }
      },
      error: null
    } as never);
    vi.mocked(fetchUpdateUserProfile).mockResolvedValue({ data: true, error: null } as never);
    const wrapper = shallowMount(Profile, {
      global: {
        renderStubDefaultSlot: true,
        stubs: Object.fromEntries(
          [
            'NAvatar',
            'IconIcRoundEdit',
            'NText',
            'NTag',
            'NSpace',
            'NDivider',
            'NCard',
            'NGi',
            'NGrid',
            'NTabs',
            'NTabPane',
            'NForm',
            'NFormItem',
            'NInput',
            'NRadioGroup',
            'NRadio',
            'NButton',
            'NSpin',
            'NUpload',
            'NModal',
            'IconIcRoundCloudUpload'
          ].map(name => [name, true])
        )
      }
    });
    await flushPromises();
    const vm = wrapper.vm as unknown as {
      infoModel: { userPhone: string; userGender: string };
      handleSaveInfo: () => Promise<void>;
    };
    expect(vm.infoModel.userPhone).toBe('');
    vm.infoModel.userGender = '2';
    await vm.handleSaveInfo();
    expect(fetchUpdateUserProfile).toHaveBeenCalledWith({ userGender: '2' });
    const clear = wrapper.findAll('n-button-stub').find(button => button.text() === 'fieldPolicy.clearValue');
    expect(clear).toBeDefined();
    await clear!.trigger('click');
    await vm.handleSaveInfo();
    expect(fetchUpdateUserProfile).toHaveBeenLastCalledWith({ userPhone: null });
    wrapper.unmount();
  });
});
