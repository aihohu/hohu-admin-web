import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

vi.mock('@/store/modules/ai', () => ({
  useAiStore: () => ({
    availableAgents: [],
    submitRoutingFeedback: vi.fn()
  })
}));

import ChatMessage from '../chat-message.vue';

const stubs = {
  NTooltip: { template: '<div><slot name="trigger"/><slot/></div>' },
  NModal: true,
  NInput: true,
  NRadioGroup: true,
  NRadio: true,
  NSelect: true
};

function message(role: Api.Ai.Message['role']): Api.Ai.Message {
  return {
    messageId: 'temp-1',
    conversationId: 'conversation-1',
    parentMessageId: null,
    role,
    messageType: 'text',
    content: 'content',
    parts: null,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-07T00:00:00Z'
  };
}

function mountMessage(role: Api.Ai.Message['role']) {
  return mount(ChatMessage, {
    props: {
      message: message(role),
      index: 0,
      isLastUserMessage: true,
      isLastAssistantMessage: true
    },
    global: { stubs }
  });
}

describe('chat-message revision safety gate', () => {
  it('hides edit while retaining copy for the last user message', () => {
    const wrapper = mountMessage('user');

    expect(wrapper.findAll('.msg-action-btn')).toHaveLength(1);
  });

  it('hides regenerate while retaining copy for the last assistant message', () => {
    const wrapper = mountMessage('assistant');

    expect(wrapper.findAll('.msg-action-btn')).toHaveLength(1);
  });
});
