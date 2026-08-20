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
          isShared: true
        },
        {
          agentId: '101',
          code: 'user_mgmt',
          name: 'User Mgmt',
          description: '',
          enabled: true,
          isBuiltin: false,
          isShared: false
        }
      ],
      boundAgentIds: ['101']
    }
  }),
  fetchUpdateRoleAgentBinding: vi.fn().mockResolvedValue({ error: null })
}));

vi.mock('@/locales', () => ({
  $t: (k: string) => k
}));

const stubs = {
  NModal: { template: '<div><slot/></div>' },
  NSpin: { template: '<div><slot/></div>' },
  NCheckboxGroup: { template: '<div><slot/></div>' },
  NCheckbox: {
    props: ['value', 'disabled', 'label'],
    template: '<input type="checkbox" :value="value" :disabled="disabled" />'
  },
  NSpace: { template: '<div><slot/></div>' },
  NTag: true,
  NAlert: true,
  NButton: true
};

async function mountWithBinding() {
  const wrapper = mount(AiAgentAuthModal, {
    props: {
      roleId: '1',
      visible: false
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
            isShared: true
          },
          {
            agentId: '101',
            code: 'shared',
            name: 'Tricky Non-Shared',
            description: '',
            enabled: true,
            isBuiltin: false,
            isShared: false
          }
        ],
        boundAgentIds: ['101']
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
});
