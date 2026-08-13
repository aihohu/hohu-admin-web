import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import UserSearch from '../user-search.vue';

vi.mock('@/service/api', () => ({
  fetchGetAllRoles: vi.fn().mockResolvedValue({ error: null, data: [] })
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

const stubs = {
  NCard: { template: '<div><slot /></div>' },
  NCollapse: { template: '<div><slot /></div>' },
  NCollapseItem: { template: '<div><slot /></div>' },
  NForm: { template: '<form><slot /></form>' },
  NGrid: { template: '<div><slot /></div>' },
  NFormItemGi: { inheritAttrs: false, template: '<div v-bind="$attrs"><slot /></div>' },
  NInput: true,
  NSelect: true,
  NSpace: { template: '<div><slot /></div>' },
  NButton: { template: '<button><slot /><slot name="icon" /></button>' },
  IconIcRoundRefresh: true,
  IconIcRoundSearch: true
};

describe('user-search layout', () => {
  it('桌面端操作按钮占一列，与七个筛选项组成两行', () => {
    const model = reactive<Api.SystemManage.UserSearchParams>({
      current: 1,
      size: 10,
      userName: null,
      nickname: null,
      userPhone: null,
      userEmail: null,
      status: null,
      userGender: null,
      roleCode: null
    });
    const wrapper = mount(UserSearch, {
      props: { model },
      global: { stubs }
    });

    expect(wrapper.find('[data-testid="user-search-actions"]').attributes('span')).toBe('24 s:12 m:6');
  });
});
