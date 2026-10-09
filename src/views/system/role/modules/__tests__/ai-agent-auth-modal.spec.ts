import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AiAgentAuthModal from '../ai-agent-auth-modal.vue';

vi.mock('@/service/api', () => ({
  fetchRoleAgentBinding: vi.fn().mockResolvedValue({
    error: null,
    data: {
      roleId: '1',
      allAgents: [
        {
          agentId: '100',
          code: 'shared',
          name: 'Shared',
          description: '',
          enabled: true,
          isBuiltin: true,
          isShared: true,
          tools: []
        },
        {
          agentId: '101',
          code: 'user_mgmt',
          name: 'User Mgmt',
          description: '',
          enabled: true,
          isBuiltin: false,
          isShared: false,
          tools: [
            {
              name: 'user.list',
              summary: 'List users',
              readonly: true,
              enabled: true,
              requiredPermissions: [{ code: 'system:user:list', granted: true }]
            },
            {
              name: 'user.create',
              summary: 'Create a user',
              readonly: false,
              enabled: true,
              requiredPermissions: [{ code: 'system:user:add', granted: false }]
            }
          ]
        }
      ],
      boundAgentIds: ['101'],
      aiChatEntryGranted: true
    }
  }),
  fetchUpdateRoleAgentBinding: vi.fn().mockResolvedValue({ error: null })
}));

vi.mock('@/locales', () => ({
  $t: (k: string) => k,
  localizedText: (text: string) => text
}));

const stubs = {
  NModal: { template: '<div><slot/><slot name="footer"/></div>' },
  NSpin: { template: '<div><slot/></div>' },
  NCheckboxGroup: { template: '<div><slot/></div>' },
  NCheckbox: {
    props: ['value', 'disabled', 'label'],
    template: '<label><input type="checkbox" :value="value" :disabled="disabled" /><slot/></label>'
  },
  NSpace: { template: '<div><slot/></div>' },
  NTag: { template: '<span><slot/></span>' },
  NEmpty: { template: '<div />' },
  NAlert: { template: '<div><slot/></div>' },
  NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot/></button>' }
};

async function mountWithBinding() {
  const wrapper = mount(AiAgentAuthModal, {
    props: {
      roleId: '1',
      visible: false,
      canOpenMenuAuth: true
    },
    global: { stubs }
  });
  // watcher only fires on visible change — flip false → true to trigger loadBinding
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
}

describe('ai-agent-auth-modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows explicit binding for shared and business Agents', async () => {
    const wrapper = await mountWithBinding();
    const checkboxes = wrapper.findAll('input[type=checkbox]');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].attributes('disabled')).toBeUndefined();
    expect(checkboxes[1].attributes('disabled')).toBeUndefined();
  });

  it('does not restore the removed shared pass-through assumption', async () => {
    const { fetchRoleAgentBinding } = await import('@/service/api');
    (fetchRoleAgentBinding as unknown as { mockResolvedValueOnce: (v: unknown) => unknown }).mockResolvedValueOnce({
      error: null,
      data: {
        roleId: '1',
        allAgents: [
          {
            agentId: '100',
            code: 'custom_shared_renamed',
            name: 'Shared',
            description: '',
            enabled: true,
            isBuiltin: true,
            isShared: true,
            tools: []
          },
          {
            agentId: '101',
            code: 'shared',
            name: 'Tricky Non-Shared',
            description: '',
            enabled: true,
            isBuiltin: false,
            isShared: false,
            tools: []
          }
        ],
        boundAgentIds: ['101'],
        aiChatEntryGranted: true
      }
    });

    const wrapper = await mountWithBinding();
    const checkboxes = wrapper.findAll('input[type=checkbox]');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].attributes('disabled')).toBeUndefined();
    expect(checkboxes[1].attributes('disabled')).toBeUndefined();
  });

  it('submits shared when it is part of the explicit complete set', async () => {
    const { fetchUpdateRoleAgentBinding } = await import('@/service/api');
    const wrapper = await mountWithBinding();
    const vm = wrapper.vm as unknown as {
      handleSubmit: () => Promise<void>;
      checkedIds: string[];
    };
    vm.checkedIds = ['100', '101'];

    await vm.handleSubmit();
    expect(fetchUpdateRoleAgentBinding).toHaveBeenCalledTimes(1);
    expect(fetchUpdateRoleAgentBinding).toHaveBeenCalledWith('1', ['100', '101']);
  });

  it('reveals a compact permission list only when an Agent is expanded', async () => {
    const wrapper = await mountWithBinding();
    expect(wrapper.text()).not.toContain('user.list');
    expect(wrapper.text()).not.toContain('List users');
    expect(wrapper.find('[data-testid="agent-detail-shared"]').exists()).toBe(false);

    await wrapper.find('[data-testid="agent-detail-user_mgmt"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="agent-detail-user_mgmt"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.text()).toContain('user.list');
    expect(wrapper.text()).toContain('system:user:list');
    expect(wrapper.text()).toContain('user.create');
    expect(wrapper.text()).toContain('system:user:add');
    expect(wrapper.text()).toContain('page.ai.aiAgentAuth.permissionMissing');
    expect(wrapper.text()).not.toContain('List users');

    await wrapper.find('[data-testid="agent-detail-user_mgmt"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('user.list');
  });

  it('saves changed Agent selection before opening menu authorization', async () => {
    const { fetchUpdateRoleAgentBinding } = await import('@/service/api');
    const wrapper = await mountWithBinding();
    const vm = wrapper.vm as unknown as { checkedIds: string[] };
    vm.checkedIds = ['100', '101'];
    await wrapper.find('[data-testid="role-agent-menu-auth"]').trigger('click');
    await flushPromises();

    expect(fetchUpdateRoleAgentBinding).toHaveBeenCalledWith('1', ['100', '101']);
    expect(wrapper.emitted('openMenuAuth')?.[0]).toEqual(['1']);
  });

  it('keeps the authorization dialog open when saving before menu authorization fails', async () => {
    const { fetchUpdateRoleAgentBinding } = await import('@/service/api');
    vi.mocked(fetchUpdateRoleAgentBinding).mockRejectedValueOnce(new Error('Save failed'));
    const wrapper = await mountWithBinding();
    const vm = wrapper.vm as unknown as { checkedIds: string[] };
    vm.checkedIds = ['100', '101'];

    await wrapper.find('[data-testid="role-agent-menu-auth"]').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('openMenuAuth')).toBeUndefined();
    expect(wrapper.props('visible')).toBe(true);
  });

  it('does not report a missing entry permission when the authorization request fails', async () => {
    const { fetchRoleAgentBinding } = await import('@/service/api');
    vi.mocked(fetchRoleAgentBinding).mockRejectedValueOnce(new Error('Load failed'));

    const wrapper = await mountWithBinding();

    expect(wrapper.text()).toContain('page.ai.aiAgentAuth.loadFailed');
    expect(wrapper.text()).not.toContain('page.ai.aiAgentAuth.entryMissing');
  });
});
