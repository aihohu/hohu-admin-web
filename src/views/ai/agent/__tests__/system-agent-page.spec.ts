import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import AgentPage from '../index.vue';

const api = vi.hoisted(() => ({ info: vi.fn(), list: vi.fn() }));
let auth = reactive({ token: 'session', userInfo: { userId: '1', isSystemAdmin: true } });
vi.mock('@/store/modules/auth', () => ({ useAuthStore: () => auth }));
vi.mock('@/service/api', () => ({ fetchGetUserInfo: api.info, fetchAgentAdminList: api.list }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/views/ai/agent/modules/agent-operate-drawer.vue', () => ({
  default: defineComponent({ template: '<div>editor</div>' })
}));
const Box = defineComponent({ props: ['title'], template: '<div>{{title}}<slot /><slot name="header-extra" /></div>' });
function page() {
  return mount(AgentPage, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        NCard: Box,
        NAlert: Box,
        NSpin: Box,
        NTag: Box,
        NEmpty: Box,
        NInput: true,
        NButton: defineComponent({ template: '<button><slot /></button>' }),
        RouterLink: Box
      }
    }
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  auth = reactive({ token: 'session', userInfo: { userId: '1', isSystemAdmin: true } });
  api.info.mockResolvedValue({ data: { isSystemAdmin: true }, error: null });
  api.list.mockResolvedValue({
    data: [{ agentId: '1', name: 'User Agent', code: 'user_mgmt', description: 'Manage users', enabled: true }],
    error: null
  });
});
it('loads using the existing system role session without a second login', async () => {
  const wrapper = page();
  await flushPromises();
  expect(wrapper.text()).toContain('User Agent');
  expect(wrapper.find('input[type="password"]').exists()).toBe(false);
  wrapper.unmount();
});
it('never loads configuration for a tenant administrator', async () => {
  auth.userInfo.isSystemAdmin = false;
  const wrapper = page();
  await flushPromises();
  expect(api.list).not.toHaveBeenCalled();
  expect(wrapper.text()).toContain('platform.noPermission');
  wrapper.unmount();
});
it('clears global configuration when the current role is withdrawn', async () => {
  const wrapper = page();
  await flushPromises();
  api.info.mockResolvedValue({ data: { isSystemAdmin: false }, error: null });
  window.dispatchEvent(new Event('focus'));
  await flushPromises();
  expect(wrapper.text()).not.toContain('User Agent');
  expect(wrapper.text()).not.toContain('editor');
  wrapper.unmount();
});
it('does not render a late response after logout', async () => {
  let resolve!: (value: unknown) => void;
  api.list.mockReturnValue(
    new Promise(r => {
      resolve = r;
    })
  );
  const wrapper = page();
  await flushPromises();
  auth.token = '';
  await flushPromises();
  resolve({ data: [{ agentId: '1', name: 'Secret Agent' }], error: null });
  await flushPromises();
  expect(wrapper.text()).not.toContain('Secret Agent');
  wrapper.unmount();
});
