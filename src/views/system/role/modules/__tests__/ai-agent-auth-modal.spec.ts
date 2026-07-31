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

  it('shared Agent 行复选框禁用，非 shared 行可勾选', async () => {
    const wrapper = await mountWithBinding();
    const checkboxes = wrapper.findAll('input[type=checkbox]');

    expect(checkboxes).toHaveLength(2);
    // 第一行 shared → disabled
    expect(checkboxes[0].attributes('disabled')).toBeDefined();
    // 第二行非 shared → 可勾选
    expect(checkboxes[1].attributes('disabled')).toBeUndefined();
  });

  it('shared 检测依赖 isShared 标志位而非 code === "shared"', async () => {
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
    // code 是 custom_shared_renamed 但 isShared=true → 禁用
    expect(checkboxes[0].attributes('disabled')).toBeDefined();
    // code 是 'shared' 但 isShared=false → 可勾选（证明用的是 isShared 标志位）
    expect(checkboxes[1].attributes('disabled')).toBeUndefined();
  });

  it('提交时请求体仅包含非 shared 的 agentId', async () => {
    const { fetchUpdateRoleAgentBinding } = await import('@/service/api');
    const wrapper = await mountWithBinding();
    const vm = wrapper.vm as unknown as { handleSubmit: () => Promise<void> };

    await vm.handleSubmit();
    expect(fetchUpdateRoleAgentBinding).toHaveBeenCalledTimes(1);
    // shared id '100' 不应出现在提交体；仅 '101'
    expect(fetchUpdateRoleAgentBinding).toHaveBeenCalledWith('1', ['101']);
  });
});
