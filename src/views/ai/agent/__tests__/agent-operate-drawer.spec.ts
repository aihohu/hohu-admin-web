import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AgentOperateDrawer from '../modules/agent-operate-drawer.vue';

vi.mock('@/service/api', () => ({
  fetchAgentAdminDetail: vi.fn().mockResolvedValue({
    error: null,
    data: {
      agentId: '1',
      code: 'user_mgmt',
      name: 'User',
      description: 'a'.repeat(60),
      enabled: true,
      isBuiltin: true,
      displayOrder: 1,
      modelPreference: null,
      dailyQuotaPerUser: null,
      riskAppetite: 'balanced',
      systemPrompt: 'sp',
      createTime: '',
      updateTime: ''
    }
  }),
  fetchUpdateAgentAdmin: vi.fn().mockResolvedValue({ error: null })
}));

vi.mock('@/service/api/ai', () => ({
  fetchGetAvailableModels: vi.fn().mockResolvedValue({ error: null, data: [] })
}));

vi.mock('@/locales', () => ({
  $t: (k: string) => k
}));

const stubs = {
  NDrawer: true,
  NDrawerContent: true,
  NForm: true,
  NFormItem: true,
  NInput: true,
  NInputNumber: true,
  NSwitch: true,
  NSelect: true,
  NButton: true,
  NSpace: true
};

async function mountWithDetail() {
  const wrapper = mount(AgentOperateDrawer, {
    props: {
      visible: false,
      editRow: { agentId: '1' } as Api.AiAgent.AdminListItem
    },
    global: { stubs }
  });
  // watcher only fires on visible change — flip false → true to trigger loadDetail
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
}

describe('agent-operate-drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('description 字符计数实时变红（< 50 / > 200）', async () => {
    const wrapper = await mountWithDetail();
    const vm = wrapper.vm as unknown as {
      descInvalid: boolean;
      model: { description?: string };
    };

    // 初始 description 长度 60（合规）
    expect(vm.descInvalid).toBe(false);

    // 改成 49 字 → 越下界
    vm.model.description = 'x'.repeat(49);
    await wrapper.vm.$nextTick();
    expect(vm.descInvalid).toBe(true);

    // 改成 201 字 → 越上界
    vm.model.description = 'x'.repeat(201);
    await wrapper.vm.$nextTick();
    expect(vm.descInvalid).toBe(true);

    // 改回 100 字 → 恢复合规
    vm.model.description = 'x'.repeat(100);
    await wrapper.vm.$nextTick();
    expect(vm.descInvalid).toBe(false);
  });

  it('description 未编辑时不报错（undefined 不触发校验）', async () => {
    const wrapper = await mountWithDetail();
    const vm = wrapper.vm as unknown as {
      descInvalid: boolean;
      model: { description?: string };
      handleSubmit: () => Promise<void>;
    };

    // 清空 description → 视为未编辑，descInvalid 为 false
    vm.model.description = undefined;
    await wrapper.vm.$nextTick();
    expect(vm.descInvalid).toBe(false);
  });

  it('提交调用 fetchUpdateAgentAdmin', async () => {
    const { fetchUpdateAgentAdmin } = await import('@/service/api');
    const wrapper = await mountWithDetail();
    const vm = wrapper.vm as unknown as { handleSubmit: () => Promise<void> };

    await vm.handleSubmit();
    expect(fetchUpdateAgentAdmin).toHaveBeenCalledTimes(1);
    expect(fetchUpdateAgentAdmin).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'User' }));
  });
});
