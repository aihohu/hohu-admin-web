import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
vi.mock('../chat-image.vue', () => ({ default: { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' } }));

const aiHarness = vi.hoisted(() => ({
  agents: [
    { code: 'dept-agent', name: 'Department Agent' },
    { code: 'role-agent', name: 'Role Agent' }
  ],
  submitRoutingFeedback: vi.fn()
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

vi.mock('@/store/modules/ai', () => ({
  useAiStore: () => ({
    availableAgents: aiHarness.agents,
    submitRoutingFeedback: aiHarness.submitRoutingFeedback
  })
}));

import ChatMessage from '../chat-message.vue';

const stubs = {
  NTooltip: { template: '<div><slot name="trigger"/><slot/></div>' },
  NModal: { template: '<div><slot /></div>' },
  NInput: true,
  NRadioGroup: true,
  NRadio: true,
  NSelect: true,
  IconIcRoundArrowUpward: true,
  IconIcRoundContentCopy: true,
  IconIcRoundEdit: true,
  IconIcRoundPerson: true,
  IconIcRoundRefresh: true,
  IconIcRoundSmartToy: true,
  IconIcRoundThumbsUpDown: true,
  IconIcRoundUpload: true
};

function message(overrides: Partial<Api.Ai.Message> = {}): Api.Ai.Message {
  return {
    messageId: 'message-1',
    conversationId: 'conversation-1',
    parentMessageId: null,
    role: 'assistant',
    messageType: 'text',
    content: 'response',
    parts: null,
    tokensInput: null,
    tokensOutput: null,
    createTime: '2026-08-24T00:00:00Z',
    ...overrides
  };
}

function mountMessage(value: Api.Ai.Message) {
  return mount(ChatMessage, {
    props: {
      message: value,
      index: 3,
      isLastUserMessage: true,
      isLastAssistantMessage: true
    },
    global: { stubs }
  });
}

describe('chat message behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiHarness.agents.splice(
      0,
      aiHarness.agents.length,
      { code: 'dept-agent', name: 'Department Agent' },
      { code: 'role-agent', name: 'Role Agent' }
    );
    aiHarness.submitRoutingFeedback.mockResolvedValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    window.$message = { success: vi.fn(), warning: vi.fn() } as unknown as typeof window.$message;
  });

  it('renders markdown code paths and copies message and code content safely', async () => {
    const wrapper = mountMessage(message({ content: '```ts\nconst safe = true\n```\n\n```unknown\n<unsafe>\n```' }));
    expect(wrapper.html()).toContain('language-ts');
    expect(wrapper.html()).toContain('&lt;unsafe&gt;');
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;

    state.copyMessageContent();
    state.handleMarkdownClick({ target: { closest: () => null } });
    state.handleMarkdownClick({
      target: {
        closest: (selector: string) =>
          selector === '.hljs-copy'
            ? { closest: () => ({ querySelector: () => ({ textContent: 'safe code' }) }) }
            : null
      }
    });
    state.handleMarkdownClick({
      target: {
        closest: () => ({ closest: () => ({ querySelector: () => null }) })
      }
    });
    state.handleMarkdownClick({ target: { closest: () => ({ closest: () => null }) } });
    state.handleMarkdownClick({
      target: {
        closest: () => ({ closest: () => ({ querySelector: () => ({ textContent: '' }) }) })
      }
    });

    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(1, expect.stringContaining('const safe'));
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(2, 'safe code');
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(3, '');
  });

  it('gives every icon-only message action an accessible name', () => {
    const assistant = mountMessage(message());
    const assistantActions = assistant.findAll('.msg-action-btn');
    expect(assistantActions.length).toBeGreaterThan(0);
    expect(assistantActions.every(button => Boolean(button.attributes('aria-label')))).toBe(true);

    const user = mountMessage(message({ role: 'user' }));
    const userActions = user.findAll('.msg-action-btn');
    expect(userActions.length).toBeGreaterThan(0);
    expect(userActions.every(button => Boolean(button.attributes('aria-label')))).toBe(true);
  });

  it('renders text, images, and file metadata across size and extension fallbacks', async () => {
    const wrapper = mountMessage(
      message({
        role: 'user',
        content: '',
        parts: [
          { type: 'text', text: 'request' },
          { type: 'file', url: '/small', filename: 'small', mediaType: 'text/plain', fileSize: 12 },
          { type: 'file', url: '/medium', filename: 'medium.csv', mediaType: 'text/csv', fileSize: 2048 },
          { type: 'file', url: '/large', mediaType: 'application/pdf', fileSize: 2 * 1024 * 1024 },
          { type: 'file', url: '/image', filename: 'photo.png', mediaType: 'image/png', fileSize: 100 }
        ]
      })
    );
    expect(wrapper.text()).toContain('request');
    expect(wrapper.text()).toContain('12 B');
    expect(wrapper.text()).toContain('2.0 KB');
    expect(wrapper.text()).toContain('2.0 MB');
    expect(wrapper.text()).toContain('page.ai.chat.fileFallback');
    await wrapper.find('.msg-image').trigger('click');
    expect(window.open).not.toHaveBeenCalled();

    await wrapper.setProps({ message: message({ role: 'user', content: 'plain', parts: [] }) });
    expect(wrapper.text()).toContain('plain');
    await wrapper.setProps({ message: message({ role: 'user', content: '   ', parts: undefined }) });
    expect(wrapper.find('.msg-bubble').exists()).toBe(false);
  });

  it('covers edit keyboard transitions including empty and shifted submissions', () => {
    const wrapper = mountMessage(message({ role: 'user', content: 'original' }));
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    state.startEdit();
    state.editContent = '   ';
    state.submitEdit();
    expect(wrapper.emitted('edit')).toBeUndefined();

    const preventDefault = vi.fn();
    state.editContent = ' updated ';
    state.handleEditKeydown({ key: 'Enter', shiftKey: true, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    state.handleEditKeydown({ key: 'Enter', shiftKey: false, preventDefault });
    expect(wrapper.emitted('edit')).toEqual([[3, 'updated']]);
    state.startEdit();
    state.handleEditKeydown({ key: 'Escape', shiftKey: false, preventDefault });
    expect(state.isEditing).toBe(false);
    state.startEdit();
    state.cancelEdit();
    expect(state.editContent).toBe('');
  });

  it('submits correct and corrected routing feedback and preserves dialog on failure', async () => {
    const wrapper = mountMessage(message());
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    expect(state.canFeedback).toBe(true);
    expect(state.feedbackAgentOptions).toHaveLength(2);
    state.openFeedback();
    expect(state.feedbackCorrectedCode).toBe('dept-agent');

    await state.submitFeedback();
    expect(aiHarness.submitRoutingFeedback).not.toHaveBeenCalled();
    state.feedbackChoice = 'wrong';
    state.feedbackCorrectedCode = '';
    await state.submitFeedback();
    expect(window.$message?.warning).toHaveBeenCalled();
    state.feedbackCorrectedCode = 'role-agent';
    await state.submitFeedback();
    expect(aiHarness.submitRoutingFeedback).toHaveBeenCalledWith('message-1', {
      feedback: 'wrong',
      correctedAgentCode: 'role-agent'
    });
    expect(state.feedbackVisible).toBe(false);

    state.openFeedback();
    state.feedbackChoice = 'correct';
    aiHarness.submitRoutingFeedback.mockResolvedValueOnce(false);
    await state.submitFeedback();
    expect(aiHarness.submitRoutingFeedback).toHaveBeenLastCalledWith('message-1', {
      feedback: 'correct',
      correctedAgentCode: undefined
    });
    expect(state.feedbackVisible).toBe(true);
    expect(state.feedbackSubmitting).toBe(false);
  });

  it('rejects feedback for temporary or user messages and handles an empty Agent list', async () => {
    const temporary = mountMessage(message({ messageId: 'temp-2' }));
    expect((temporary.vm.$ as unknown as { setupState: Record<string, any> }).setupState.canFeedback).toBe(false);
    const missingId = mountMessage(message({ messageId: '' }));
    expect((missingId.vm.$ as unknown as { setupState: Record<string, any> }).setupState.canFeedback).toBe(false);
    const user = mountMessage(message({ role: 'user' }));
    expect((user.vm.$ as unknown as { setupState: Record<string, any> }).setupState.canFeedback).toBe(false);

    aiHarness.agents.splice(0);
    const empty = mountMessage(message());
    const state = (empty.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    state.openFeedback();
    expect(state.feedbackCorrectedCode).toBe('');
  });
});
