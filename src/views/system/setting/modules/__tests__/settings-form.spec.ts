import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SettingsForm from '../settings-form.vue';

const mocks = vi.hoisted(() => ({
  groups: vi.fn(),
  group: vi.fn(),
  save: vi.fn(),
  refresh: vi.fn(),
  apply: vi.fn(),
  replace: vi.fn(),
  leave: vi.fn(),
  query: {} as Record<string, string>,
  canEdit: true
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.query }),
  useRouter: () => ({ replace: mocks.replace }),
  onBeforeRouteLeave: mocks.leave
}));
vi.mock('@/service/api/settings', () => ({
  fetchSettingGroups: mocks.groups,
  fetchSettingGroup: mocks.group,
  saveSettingGroup: mocks.save
}));
vi.mock('@/utils/runtime-settings', () => ({ refreshRuntimeSettings: mocks.refresh }));
vi.mock('@/store/modules/app', () => ({ useAppStore: () => ({ applyDefaultLocale: mocks.apply }) }));
vi.mock('@/hooks/business/auth', () => ({
  useAuth: () => ({ hasAuth: (key: string) => key === 'system:setting:edit' && mocks.canEdit })
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/components/custom/file-upload.vue', () => ({ default: { template: '<div />' } }));

const group = {
  group: 'brand',
  values: { site_name: 'Original' },
  revision: 'revision',
  fields: [{ key: 'site_name', kind: 'text', options: [], minimum: null, maximum: null }],
  secretKeys: [],
  configuredSecrets: []
};
const container = { template: '<div><slot /></div>' };
const stubs = {
  NCard: container,
  NTabs: { props: ['value'], emits: ['update:value'], template: '<div><slot /></div>' },
  NTab: container,
  NForm: container,
  NFormItem: container,
  NSpin: container,
  NAlert: container,
  NInput: {
    props: ['value'],
    template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
  },
  NSelect: true,
  NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  NInputNumber: true,
  NSwitch: true,
  NImage: true
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canEdit = true;
  mocks.query = {};
  mocks.groups.mockResolvedValue({ data: ['brand'], error: null });
  mocks.group.mockImplementation(async () => ({ data: structuredClone(group), error: null }));
  mocks.save.mockResolvedValue({ data: { ...group, revision: 'new' }, error: null });
  mocks.refresh.mockResolvedValue({ defaultLocale: 'en-US' });
});

it('preserves drafts across tabs and saves only the active group', async () => {
  mocks.groups.mockResolvedValue({ data: ['brand', 'account'], error: null });
  mocks.group.mockImplementation(async (name: string) => ({
    data: { ...structuredClone(group), group: name },
    error: null
  }));
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  await wrapper.get('input').setValue('Unsaved brand');
  wrapper.findComponent(stubs.NTabs).vm.$emit('update:value', 'account');
  await flushPromises();
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(mocks.save).toHaveBeenCalledWith('account', { values: { site_name: 'Original' }, revision: 'revision' });
  wrapper.findComponent(stubs.NTabs).vm.$emit('update:value', 'brand');
  await flushPromises();
  expect(wrapper.get('input').element.value).toBe('Unsaved brand');
  expect(mocks.group).toHaveBeenCalledTimes(2);
  expect(mocks.replace).toHaveBeenLastCalledWith({ query: { tab: 'brand' } });
  wrapper.unmount();
});

it('restores the group from the URL', async () => {
  mocks.query = { tab: 'account' };
  mocks.groups.mockResolvedValue({ data: ['brand', 'account'], error: null });
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  expect(mocks.group).toHaveBeenCalledWith('account');
  wrapper.unmount();
});

it('retries the group list after an initial failure', async () => {
  mocks.groups.mockResolvedValueOnce({ data: null, error: new Error('offline') });
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('input').exists()).toBe(false);
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(mocks.groups).toHaveBeenCalledTimes(2);
  expect(wrapper.get('input').element.value).toBe('Original');
  wrapper.unmount();
});

it('warns before leaving with drafts and stops warning after saving', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  const guard = mocks.leave.mock.calls[0][0];
  expect(guard()).toBe(true);
  await wrapper.get('input').setValue('Draft');
  expect(guard()).toBe(false);
  expect(confirm).toHaveBeenCalledOnce();
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(guard()).toBe(true);
  wrapper.unmount();
  confirm.mockRestore();
});

it('saves original values with a revision and refreshes runtime consumers', async () => {
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  await wrapper.get('input').setValue('Custom brand');
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(mocks.save).toHaveBeenCalledWith('brand', { values: { site_name: 'Custom brand' }, revision: 'revision' });
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.apply).toHaveBeenCalledWith('en-US');
  wrapper.unmount();
});

it('renders read-only settings without an update button', async () => {
  mocks.canEdit = false;
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  expect(wrapper.find('button').exists()).toBe(false);
  expect(mocks.save).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('does not refresh runtime state when saving conflicts', async () => {
  mocks.save.mockResolvedValue({ data: null, error: new Error('SETTINGS_CONFLICT') });
  const wrapper = mount(SettingsForm, { global: { stubs } });
  await flushPromises();
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(wrapper.get('input').element.value).toBe('Original');
  wrapper.unmount();
});

it('renders extension options from field metadata', async () => {
  mocks.groups.mockResolvedValue({ data: ['files'], error: null });
  mocks.group.mockResolvedValue({
    data: {
      group: 'files',
      values: { 'upload:allowed_extensions': '.md,.png' },
      revision: 'revision',
      fields: [
        {
          key: 'upload:allowed_extensions',
          kind: 'extensions',
          options: ['.md', '.png', '.zip'],
          minimum: null,
          maximum: null
        }
      ],
      secretKeys: [],
      configuredSecrets: []
    },
    error: null
  });
  const selectStub = {
    props: ['options', 'value', 'multiple'],
    template: '<div data-testid="extensions-select" />'
  };
  const wrapper = mount(SettingsForm, { global: { stubs: { ...stubs, NSelect: selectStub } } });
  await flushPromises();
  const select = wrapper.findComponent(selectStub);
  expect(select.props('options')).toEqual([
    { label: '.md', value: '.md' },
    { label: '.png', value: '.png' },
    { label: '.zip', value: '.zip' }
  ]);
  wrapper.unmount();
});
