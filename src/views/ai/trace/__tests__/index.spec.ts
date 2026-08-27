import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const listMock = vi.fn().mockResolvedValue({
  error: null,
  data: {
    records: [
      {
        traceId: 'tr_phase4',
        actorId: '7',
        actorName: 'alice',
        agentCodes: ['user_mgmt'],
        toolNames: ['user.lookup'],
        statuses: ['success'],
        operationCount: 1,
        queuedAt: '2026-08-24T08:00:00Z',
        finishedAt: '2026-08-24T08:00:01Z'
      }
    ],
    total: 1,
    current: 1,
    size: 20
  }
});

const detailMock = vi.fn().mockResolvedValue({
  error: null,
  data: {
    traceId: 'tr_phase4',
    conversationId: '900',
    operations: [
      {
        logId: '101',
        toolCallId: 'tc_phase4',
        toolName: 'user.lookup',
        agentCode: 'user_mgmt',
        actorId: '7',
        actorName: 'alice',
        sourceMessageId: '55',
        sourceMessageRole: 'user',
        sourceMessageAt: '2026-08-24T08:00:00Z',
        targetSummary: [{ type: 'user', id: '42' }],
        executionMode: 'autonomous',
        riskLevel: 'low',
        status: 'success',
        errorCode: null,
        confirmationId: null,
        approvedBy: null,
        queuedAt: '2026-08-24T08:00:00Z',
        startedAt: '2026-08-24T08:00:00Z',
        finishedAt: '2026-08-24T08:00:01Z',
        durationMs: 10,
        hitlWaitMs: 0,
        rawArgs: 'TRACE_SENTINEL_RAW_ARGS',
        content: 'TRACE_SENTINEL_MESSAGE_CONTENT'
      }
    ]
  }
});

vi.mock('@/service/api', () => ({
  fetchAiTraceList: (...args: unknown[]) => listMock(...args),
  fetchAiTraceDetail: (...args: unknown[]) => detailMock(...args)
}));

vi.mock('@/locales', () => ({ $t: (key: string) => key }));

const stubs = {
  NCard: { template: '<div><slot/></div>' },
  NSpace: { template: '<div><slot/></div>' },
  NForm: { template: '<form><slot/></form>' },
  NFormItem: { template: '<label><slot/></label>' },
  NInput: true,
  NSelect: true,
  NDatePicker: true,
  NButton: { template: '<button @click="$emit(\'click\')"><slot/></button>' },
  NDataTable: true,
  NDrawer: { template: '<aside><slot/></aside>' },
  NDrawerContent: { template: '<section><slot/></section>' },
  NDescriptions: { template: '<dl><slot/></dl>' },
  NDescriptionsItem: { template: '<div><slot/></div>' },
  NTag: { template: '<span><slot/></span>' },
  NCollapse: { template: '<div><slot/></div>' },
  NCollapseItem: { template: '<div><slot/></div>' }
};

import AiTracePage from '../index.vue';

describe('AI Trace audit page', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    listMock.mockClear();
    detailMock.mockClear();
  });

  it('applies a trace deep-link filter on mount', async () => {
    window.history.replaceState({}, '', '/ai/trace?traceId=tr_deep_link');
    mount(AiTracePage, { global: { stubs } });
    await flushPromises();

    expect(listMock.mock.calls[0]?.[0]).toMatchObject({ traceId: 'tr_deep_link' });
  });

  it('loads the independent tenant Trace list on mount', async () => {
    mount(AiTracePage, { global: { stubs } });
    await flushPromises();

    expect(listMock).toHaveBeenCalledOnce();
    expect(listMock.mock.calls[0]?.[0]).toMatchObject({ current: 1, size: 20 });
  });

  it('renders only allowlisted detail metadata', async () => {
    const wrapper = mount(AiTracePage, { attachTo: document.body, global: { stubs } });
    await flushPromises();

    const vm = wrapper.vm as unknown as { openTrace: (traceId: string) => Promise<void> };
    await vm.openTrace('tr_phase4');
    await flushPromises();
    expect(detailMock).toHaveBeenCalledWith('tr_phase4');
    const rendered = document.body.textContent || '';
    expect(rendered).toContain('user.lookup');
    expect(rendered).toContain('user:42');
    expect(rendered).not.toContain('TRACE_SENTINEL_RAW_ARGS');
    expect(rendered).not.toContain('TRACE_SENTINEL_MESSAGE_CONTENT');
    wrapper.unmount();
  });
});
