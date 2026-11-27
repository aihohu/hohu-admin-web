import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { fetchGetAllRoles } from '@/service/api';
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
  it('操作按钮占据当前响应式网格的最右一列', () => {
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
      props: { model, filters: [] },
      global: { stubs }
    });

    const actions = wrapper.get('[data-testid="user-search-actions"]');
    expect(actions.attributes('span')).toBe('24 s:12 m:6');
    expect(actions.attributes()).toHaveProperty('suffix');
  });
});

it('only renders granted search controls and only loads usable role options', async () => {
  vi.mocked(fetchGetAllRoles).mockClear();
  const wrapper = mount(UserSearch, {
    props: { model: { current: 1, size: 10 }, filters: ['userName', 'status'] },
    global: { stubs }
  });
  expect(wrapper.find('[path="nickname"]').exists()).toBe(false);
  expect(wrapper.find('[path="userName"]').exists()).toBe(true);
  expect(wrapper.find('[path="userPhone"]').exists()).toBe(false);
  expect(fetchGetAllRoles).not.toHaveBeenCalled();
  await wrapper.setProps({ filters: ['userPhone', 'roleCode'] });
  expect(wrapper.find('[path="userPhone"]').exists()).toBe(true);
  expect(fetchGetAllRoles).toHaveBeenCalledTimes(1);
  await wrapper.setProps({ filters: [] });
  expect(wrapper.find('[path="roleCode"]').exists()).toBe(false);
});
