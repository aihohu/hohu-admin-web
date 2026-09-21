import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ChatAvailability } from '@/store/modules/ai';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/service/api', () => ({ fetchSaveConversation: vi.fn() }));
vi.mock('../chat-message.vue', () => ({
  default: {
    props: ['message'],
    template: '<div class="stub-message" :data-bubble-id="message.messageId">{{ message.content }}</div>'
  }
}));
vi.mock('../chat-tool-call.vue', () => ({
  default: {
    props: ['started'],
    template: '<div class="tool-card" :data-tool-id="started.toolCallId">{{ started.tool }}</div>'
  }
}));
vi.mock('../chat-input.vue', () => ({ default: { template: '<div class="stub-input" />' } }));
vi.mock('../chat-confirmation-drawer.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../chat-clarification.vue', () => ({ default: { template: '<div />' } }));

const messages: Api.Ai.Message[] = [
  {
    messageId: 'assistant-1',
    conversationId: 'conversation-1',
    parentMessageId: 'user-1',
    role: 'assistant',
    messageType: 'text',
    content: 'first answer',
    parts: null,
    toolCalls: [{ tool: 'first.tool', tool_call_id: 'tc-1', ok: true }],
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:00Z'
  },
  {
    messageId: 'assistant-2',
    conversationId: 'conversation-1',
    parentMessageId: 'user-2',
    role: 'assistant',
    messageType: 'text',
    content: 'second answer',
    parts: null,
    toolCalls: [
      { tool: 'second.tool', tool_call_id: 'tc-2', ok: true },
      { tool: 'third.tool', tool_call_id: 'tc-3', ok: true }
    ],
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:01Z'
  },
  {
    messageId: 'assistant-tool-only',
    conversationId: 'conversation-1',
    parentMessageId: 'user-3',
    role: 'assistant',
    messageType: 'text',
    content: '',
    parts: null,
    toolCalls: [{ tool: 'only.tool', tool_call_id: 'tc-only', ok: true }],
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-12T00:00:02Z'
  }
];

const aiStore = {
  currentConversationId: 'conversation-1',
  currentMessages: messages as Api.Ai.MessageProjection[],
  attachedImages: [],
  attachedFiles: [],
  availableAgents: [] as Api.Ai.Agent[],
  chatAvailability: 'ready' as ChatAvailability,
  conversationNotice: null as 'unavailable' | null,
  clearCurrentConversation: vi.fn(),
  redactedPendingActions: [],
  isStreaming: false,
  streamingText: '',
  pendingConfirmation: null,
  pendingActionsById: {},
  selectedAgentCode: '',
  selectedModelId: '',
  messageToolCards: (message: Api.Ai.MessageProjection) =>
    ('toolCalls' in message ? message.toolCalls || [] : []).map(toolCall => ({
      started: {
        type: 'tool_call_started' as const,
        tool: toolCall.tool,
        toolCallId: toolCall.tool_call_id,
        summary: '',
        args: {},
        risk: 'low' as const,
        traceId: ''
      },
      result: null,
      isPending: false
    })),
  streamToolCards: () => [],
  pendingToolCardsAfterMessage: () => [],
  regenerate: vi.fn(),
  editAndResend: vi.fn(),
  approveTool: vi.fn(),
  rejectTool: vi.fn(),
  stopStreaming: vi.fn(),
  sendMessage: vi.fn(),
  loadConversations: vi.fn(),
  selectConversation: vi.fn()
};

vi.mock('@/store/modules/ai', () => ({ useAiStore: () => aiStore }));

import ChatMain from '../chat-main.vue';

const stubs = {
  ChatMessage: {
    props: ['message'],
    template: '<div class="stub-message" :data-bubble-id="message.messageId">{{ message.content }}</div>'
  },
  ChatToolCall: {
    props: ['started'],
    template: '<div class="tool-card" :data-tool-id="started.toolCallId">{{ started.tool }}</div>'
  },
  ChatInput: { template: '<div class="stub-input" />' },
  ChatConfirmationDrawer: true,
  ChatClarification: true,
  NSpin: true
};

describe('chat tool cards embedded by message owner', () => {
  beforeEach(() => {
    aiStore.currentConversationId = 'conversation-1';
    aiStore.currentMessages = messages;
    aiStore.availableAgents = [];
    aiStore.redactedPendingActions = [];
    aiStore.chatAvailability = 'ready';
    aiStore.conversationNotice = null;
  });

  it('renders each persisted card under its own assistant wrapper in array order', () => {
    const wrapper = mount(ChatMain, { global: { stubs } });
    const first = wrapper.get('[data-message-id="assistant-1"]');
    const second = wrapper.get('[data-message-id="assistant-2"]');

    expect(first.findAll('.tool-card').map(card => card.attributes('data-tool-id'))).toEqual(['tc-1']);
    expect(second.findAll('.tool-card').map(card => card.attributes('data-tool-id'))).toEqual(['tc-2', 'tc-3']);
    expect(wrapper.find('.tool-call-list').exists()).toBe(false);
  });

  it('renders a tool-only owner without an empty message bubble', () => {
    const wrapper = mount(ChatMain, { global: { stubs } });
    const group = wrapper.get('[data-message-id="assistant-tool-only"]');

    expect(group.find('.stub-message').exists()).toBe(false);
    expect(group.get('.tool-card').attributes('data-tool-id')).toBe('tc-only');
  });

  it('renders a stable tombstone without restoring result content or tool cards', () => {
    aiStore.currentMessages = [
      {
        messageId: 'assistant-redacted',
        role: 'assistant',
        status: 'redacted',
        errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN'
      }
    ];

    const wrapper = mount(ChatMain, { global: { stubs } });

    expect(wrapper.get('[data-testid="ai-message-tombstone"]').text()).toContain(
      'page.ai.chat.resultProjectionForbidden'
    );
    expect(wrapper.find('.stub-message').exists()).toBe(false);
    expect(wrapper.find('.tool-card').exists()).toBe(false);
  });

  it('renders a stable no-Agent state without an active chat surface', () => {
    aiStore.chatAvailability = 'no_agents';

    const wrapper = mount(ChatMain, { global: { stubs } });

    expect(wrapper.get('[data-testid="ai-chat-availability"]').attributes('data-state')).toBe('no_agents');
    expect(wrapper.text()).toContain('page.ai.chat.availabilityNoAgents');
    expect(wrapper.find('[data-message-id="assistant-1"]').exists()).toBe(false);
  });

  it('does not render old conversation contents after chat permission revocation', () => {
    aiStore.chatAvailability = 'forbidden';

    const wrapper = mount(ChatMain, { global: { stubs } });

    expect(wrapper.get('[data-testid="ai-chat-availability"]').attributes('data-state')).toBe('forbidden');
    expect(wrapper.find('[data-message-id="assistant-1"]').exists()).toBe(false);
    expect(wrapper.find('.stub-input').exists()).toBe(false);
  });

  it('shows a persistent unavailable notice and an explicit new-conversation action', async () => {
    aiStore.currentConversationId = '';
    aiStore.conversationNotice = 'unavailable';
    const wrapper = mount(ChatMain, {
      global: { stubs: { ...stubs, NButton: { template: '<button><slot /></button>' } } }
    });
    expect(wrapper.get('[role="alert"]').text()).toContain('page.ai.chat.conversationUnavailable');
    expect(wrapper.find('.stub-input').exists()).toBe(false);
    await wrapper.get('button').trigger('click');
    expect(aiStore.clearCurrentConversation).toHaveBeenCalled();
    expect(aiStore.sendMessage).not.toHaveBeenCalled();
  });

  it('only renders scenario cards backed by a currently authorized Agent', () => {
    aiStore.currentConversationId = '';
    aiStore.currentMessages = [];
    aiStore.availableAgents = [
      { code: 'user_mgmt', name: 'User', description: '', modelPreference: null, displayOrder: 1 }
    ];

    const wrapper = mount(ChatMain, { global: { stubs } });

    expect(wrapper.findAll('.scene-card')).toHaveLength(2);
    expect(wrapper.text()).toContain('page.ai.chat.sceneUserTitle');
    expect(wrapper.text()).not.toContain('page.ai.chat.sceneFileTitle');
    expect(wrapper.text()).not.toContain('page.ai.chat.sceneJobTitle');
  });
});
