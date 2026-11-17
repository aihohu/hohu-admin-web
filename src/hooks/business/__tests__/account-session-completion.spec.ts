import { flushPromises, shallowMount } from '@vue/test-utils';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Avatar from '@/layouts/modules/global-header/components/user-avatar.vue';
import Empty from '@/views/_builtin/empty/index.vue';
import Profile from '@/views/_builtin/profile/index.vue';
import { localStg } from '@/utils/storage';

const mocks = vi.hoisted(() => ({
  auth: { authSessionRevision: 'A', isLogin: true, userInfo: {}, resetStore: vi.fn() },
  logout: vi.fn(),
  password: vi.fn(),
  navigate: vi.fn(),
  dialog: vi.fn(),
  success: vi.fn()
}));
vi.mock('@/store/modules/auth', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/service/api', () => ({
  fetchLogout: mocks.logout,
  fetchChangePassword: mocks.password,
  fetchGetUserProfile: vi.fn().mockResolvedValue({ data: null, error: new Error('not loaded') }),
  fetchUpdateUserProfile: vi.fn(),
  fetchUploadFile: vi.fn()
}));
vi.mock('@/views/_builtin/profile/email-binding.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/hooks/common/router', () => ({
  useRouterPush: () => ({ toLogin: mocks.navigate, routerPushByKey: mocks.navigate })
}));
vi.mock('@/hooks/common/icon', () => ({ useSvgIcon: () => ({ SvgIconVNode: vi.fn() }) }));
vi.mock('@/hooks/common/form', () => ({
  useFormRules: () => ({}),
  useNaiveForm: () => ({ formRef: ref(null), validate: vi.fn(), restoreValidation: vi.fn() })
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise(accept => {
    resolve = accept;
  });
  return { promise, resolve };
}
function identity(revision: string) {
  localStg.set('authSessionRevision', revision);
  localStg.set('token', `${revision}-access`);
  mocks.auth.authSessionRevision = revision;
}
const stubs = Object.fromEntries(
  [
    'NAvatar',
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
    'NDropdown',
    'ButtonIcon',
    'SvgIcon',
    'IconIcRoundEdit',
    'IconIcRoundCloudUpload'
  ].map(name => [name, true])
);
function mount(kind: string) {
  return shallowMount(kind === 'avatar' ? Avatar : kind === 'empty' ? Empty : Profile, {
    global: { renderStubDefaultSlot: true, stubs }
  });
}
async function start(kind: string, wrapper: ReturnType<typeof mount>) {
  const vm = wrapper.vm as unknown as {
    handleDropdown: (key: string) => void;
    handleLogout: () => Promise<void>;
    handleChangePassword: () => Promise<void>;
  };
  if (kind === 'avatar') {
    vm.handleDropdown('logout');
    const options = mocks.dialog.mock.calls[0][0] as { onPositiveClick: () => Promise<void> };
    return { job: options.onPositiveClick() };
  }
  return { job: kind === 'empty' ? vm.handleLogout() : vm.handleChangePassword() };
}

describe('account callers preserve the initiating session through asynchronous completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    identity('A');
    window.$dialog = { info: mocks.dialog } as never;
    window.$message = { success: mocks.success } as never;
    mocks.auth.resetStore.mockImplementation(async () => {
      identity('anonymous');
      localStg.remove('token');
    });
  });
  afterEach(() => {
    localStg.remove('authSessionRevision');
    localStg.remove('token');
  });
  it.each(['avatar', 'empty', 'password'])('ignores old %s completion after B logs in', async kind => {
    const pending = deferred();
    (kind === 'password' ? mocks.password : mocks.logout).mockReturnValue(pending.promise);
    const wrapper = mount(kind);
    const { job } = await start(kind, wrapper);
    await flushPromises();
    expect(kind === 'password' ? mocks.password : mocks.logout).toHaveBeenCalledOnce();
    identity('B');
    wrapper.unmount();
    pending.resolve(kind === 'password' ? { data: true, error: null } : { error: new Error('cancelled old request') });
    await job;
    expect(mocks.auth.resetStore).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it.each(['avatar', 'empty'])('ignores even a successful old %s logout response', async kind => {
    const pending = deferred();
    mocks.logout.mockReturnValue(pending.promise);
    const wrapper = mount(kind);
    const { job } = await start(kind, wrapper);
    identity('B');
    pending.resolve({ data: true, error: null });
    await job;
    expect(mocks.auth.resetStore).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it.each(['avatar', 'empty', 'password'])('does not begin %s under unaccepted storage credentials', async kind => {
    identity('B');
    mocks.auth.authSessionRevision = 'A';
    const wrapper = mount(kind);
    if (kind === 'avatar') {
      (wrapper.vm as unknown as { handleDropdown: (key: string) => void }).handleDropdown('logout');
      expect(mocks.dialog).not.toHaveBeenCalled();
    } else {
      const { job } = await start(kind, wrapper);
      await job;
    }
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.password).not.toHaveBeenCalled();
    expect(mocks.auth.resetStore).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('does not submit an old avatar logout confirmation under B', async () => {
    const wrapper = mount('avatar');
    (wrapper.vm as unknown as { handleDropdown: (key: string) => void }).handleDropdown('logout');
    identity('B');
    const options = mocks.dialog.mock.calls[0][0] as { onPositiveClick: () => Promise<void> };
    await options.onPositiveClick();
    expect(mocks.logout).not.toHaveBeenCalled();
    expect(mocks.auth.resetStore).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it.each(['empty', 'password'])('does not navigate from %s when B logs in during local reset', async kind => {
    const pending = deferred();
    mocks.logout.mockResolvedValue({ error: new Error('network') });
    mocks.password.mockResolvedValue({ error: null });
    mocks.auth.resetStore.mockImplementation(() => {
      identity('anonymous');
      localStg.remove('token');
      return pending.promise;
    });
    const wrapper = mount(kind);
    const { job } = await start(kind, wrapper);
    await flushPromises();
    expect(mocks.auth.resetStore).toHaveBeenCalledOnce();
    identity('B');
    pending.resolve(undefined);
    await job;
    expect(mocks.navigate).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it.each(['avatar', 'empty'])('keeps same-session %s local logout on network failure', async kind => {
    mocks.logout.mockResolvedValue({ error: new Error('network') });
    const wrapper = mount(kind);
    const { job } = await start(kind, wrapper);
    await job;
    expect(mocks.auth.resetStore).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
