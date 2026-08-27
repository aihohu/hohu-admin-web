import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';

const dialogWarning = vi.fn();
const store = reactive({
  pendingConfirmation: null as any,
  pendingClarification: null as any,
  conversations: [] as Array<{ conversationId: string; title: string }>,
  currentConversationId: null as string | null,
  hasMoreConversations: true,
  loading: false,
  approveTool: vi.fn(),
  rejectTool: vi.fn(),
  pickClarificationAgent: vi.fn(),
  dismissClarification: vi.fn(),
  loadConversations: vi.fn(),
  loadMoreConversations: vi.fn(),
  clearCurrentConversation: vi.fn(),
  selectConversation: vi.fn(),
  removeConversation: vi.fn()
});

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`,
    te: (key: string) => key.includes('localized')
  })
}));
vi.mock('naive-ui', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useDialog: () => ({ warning: dialogWarning }) };
});
vi.mock('@/store/modules/ai', () => ({ useAiStore: () => store }));

import ChatClarification from '../chat-clarification.vue';
import ChatConfirmationDrawer from '../chat-confirmation-drawer.vue';
import ChatSidebar from '../chat-sidebar.vue';

const buttonStub = {
  inheritAttrs: false,
  emits: ['click'],
  template: '<button :class="$attrs.class" @click="$emit(\'click\', $event)"><slot/><slot name="icon"/></button>'
};
const drawerStubs = {
  NDrawer: { template: '<aside><slot/></aside>' },
  NDrawerContent: { template: '<section><slot/><slot name="footer"/></section>' },
  NButton: buttonStub,
  NTag: { template: '<span><slot/></span>' },
  NStatistic: { props: ['label', 'value'], template: '<span>{{ label }}:{{ value }}</span>' },
  IconIcRoundRefresh: true,
  IconIcRoundAccessTime: true
};

describe('chat confirmation, clarification, and sidebar support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.pendingConfirmation = null;
    store.pendingClarification = null;
    store.conversations = [];
    store.currentConversationId = null;
    store.hasMoreConversations = true;
    store.loading = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders restored HITL metadata, localized fields, warnings, dry-run, and both decisions', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T08:00:00Z'));
    store.pendingConfirmation = {
      type: 'confirmation_resumed',
      confirmationId: 'cid-phase4',
      actionId: 'action-phase4',
      tool: 'custom.write',
      toolCallId: 'tc-phase4',
      sourceToolCallId: null,
      interactionFlow: 'direct',
      traceId: 'tr-phase4',
      summary: 'fallback summary',
      presentation: {
        title: 'Update user',
        summaryKey: 'phase4.localized.summary',
        summaryParams: { count: 1 },
        fields: [{ label: 'nickname', value: 'Alice', displayValue: 'Alice' }],
        warningKeys: ['phase4.localized.warning']
      },
      dryRun: {
        affectedCount: 1,
        summaryKey: 'phase4.localized.dryRun',
        summaryParams: { count: 1 },
        affectedExamples: ['Alice']
      },
      expiresAt: '2026-08-24T08:01:00Z',
      resumedAt: '2026-08-24T08:00:05Z'
    };
    const wrapper = mount(ChatConfirmationDrawer, {
      props: { show: false },
      attachTo: document.body,
      global: { stubs: { IconIcRoundRefresh: true, IconIcRoundAccessTime: true } }
    });
    await wrapper.setProps({ show: true });
    await wrapper.vm.$nextTick();

    const rendered = document.body.textContent || '';
    expect(rendered).toContain('phase4.localized.summary');
    expect(rendered).toContain('phase4.localized.warning');
    expect(rendered).toContain('phase4.localized.dryRun');
    expect(rendered).toContain('Alice');
    expect(rendered).toContain('60');
    (document.querySelector('[data-testid="ai-confirm-reject"]') as HTMLButtonElement).click();
    (document.querySelector('[data-testid="ai-confirm-approve"]') as HTMLButtonElement).click();
    await wrapper.vm.$nextTick();
    expect(store.rejectTool).toHaveBeenCalledOnce();
    expect(store.approveTool).toHaveBeenCalledOnce();
    expect(wrapper.emitted('update:show')).toEqual([[false], [false]]);
    wrapper.unmount();
  });

  it('handles an absent confirmation and clears its countdown when closed', async () => {
    vi.useFakeTimers();
    const wrapper = mount(ChatConfirmationDrawer, {
      props: { show: false },
      global: { stubs: drawerStubs }
    });
    expect(wrapper.find('.confirm-content').exists()).toBe(false);
    await wrapper.setProps({ show: true });
    await wrapper.setProps({ show: false });
    wrapper.unmount();
  });

  it('renders clarification candidates and delegates choose or dismiss actions', async () => {
    store.pendingClarification = {
      type: 'clarification_required',
      message: 'Choose an Agent',
      candidates: [
        { code: 'user_mgmt', name: 'User Agent', description: 'Users' },
        { code: 'dept_mgmt', name: 'Department Agent', description: '' }
      ]
    };
    const wrapper = mount(ChatClarification, {
      global: {
        stubs: {
          Transition: false,
          IconIcRoundQuestionAnswer: true,
          IconIcRoundSmartToy: true
        }
      }
    });

    expect(wrapper.text()).toContain('Choose an Agent');
    expect(wrapper.text()).toContain('User Agent');
    await wrapper.findAll('.candidate-card')[0].trigger('click');
    await wrapper.get('.clarification-close').trigger('click');
    expect(store.pickClarificationAgent).toHaveBeenCalledWith('user_mgmt');
    expect(store.dismissClarification).toHaveBeenCalledOnce();
  });

  it('searches, selects, creates, paginates, and confirms conversation deletion', async () => {
    vi.useFakeTimers();
    store.conversations = [
      { conversationId: '1', title: 'First' },
      { conversationId: '2', title: '' }
    ];
    store.currentConversationId = '1';
    const inputStub = {
      inheritAttrs: false,
      props: ['value'],
      emits: ['update:value'],
      template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
    };
    const wrapper = mount(ChatSidebar, {
      global: {
        stubs: {
          NButton: buttonStub,
          NInput: inputStub,
          NScrollbar: { template: '<div class="scroll-stub"><slot/></div>' },
          NEmpty: true,
          NSpin: true,
          IconIcRoundPlus: true,
          IconIcRoundSearch: true,
          IconIcRoundChatBubbleOutline: true,
          IconIcRoundDeleteOutline: true
        }
      }
    });

    await wrapper.get('input').setValue('  east  ');
    vi.advanceTimersByTime(300);
    expect(store.loadConversations).toHaveBeenCalledWith('east');
    await wrapper.findAll('.conv-item')[0].trigger('click');
    expect(store.selectConversation).toHaveBeenCalledWith('1');
    await wrapper.findAll('.conv-delete')[0].trigger('click');
    const options = dialogWarning.mock.calls[0][0];
    await options.onPositiveClick();
    expect(store.removeConversation).toHaveBeenCalledWith('1');

    const scroller = wrapper.get('.scroll-stub');
    Object.defineProperties(scroller.element, {
      scrollHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 60 },
      clientHeight: { configurable: true, value: 40 }
    });
    await scroller.trigger('scroll');
    expect(store.loadMoreConversations).toHaveBeenCalledOnce();
    await wrapper.findAll('button')[0].trigger('click');
    expect(store.clearCurrentConversation).toHaveBeenCalledOnce();
  });
});
