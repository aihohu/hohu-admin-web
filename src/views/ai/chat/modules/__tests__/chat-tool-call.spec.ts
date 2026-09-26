import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
vi.mock('@/service/request/platform', () => ({ platformRequest: vi.fn() }));

const requestMock = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`,
    te: () => true
  })
}));

vi.mock('@/service/request', () => ({ request: (...args: unknown[]) => requestMock(...args) }));

import ChatToolCall from '../chat-tool-call.vue';

function started(overrides: Record<string, unknown> = {}) {
  return {
    type: 'tool_call_started',
    tool: 'user.lookup',
    toolCallId: 'tc-phase4',
    summary: 'safe summary',
    args: { query: 'alice', count: 2 },
    risk: 'low',
    traceId: 'tr-phase4',
    chipTarget: '/system/user',
    ...overrides
  } as Api.Ai.ToolCallStartedEvent;
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    type: 'tool_call_result',
    tool: 'user.lookup',
    toolCallId: 'tc-phase4',
    ok: true,
    durationMs: 12,
    result: { matches: 2 },
    affectedRows: 2,
    ...overrides
  } as Api.Ai.ToolCallResultEvent;
}

function render(props: Record<string, unknown>) {
  return mount(ChatToolCall, {
    props: props as any,
    global: {
      stubs: {
        RouterLink: { props: ['to'], template: '<a :href="to"><slot/></a>' }
      }
    }
  });
}

describe('chat tool result card', () => {
  beforeEach(() => {
    requestMock.mockReset();
    (window as any).$message = { error: vi.fn() };
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:phase4'),
      revokeObjectURL: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as any).$message;
  });

  it('renders running, successful, and failed lifecycle states', async () => {
    const wrapper = render({ started: started() });
    expect(wrapper.get('.tool-card').attributes('data-status')).toBe('running');
    expect(wrapper.get('.tool-card').attributes('data-trace-id')).toBe('tr-phase4');
    expect(wrapper.get('.tool-card-head').text()).toContain('page.ai.chat.toolDescriptions.userLookup');
    expect(wrapper.get('.tool-card-head').text()).toContain('page.ai.chat.toolRiskLow');
    expect(wrapper.get('.tool-card-head').text()).not.toContain('user.lookup');
    expect(wrapper.get('.tool-card-head').text()).not.toContain(' low');

    await wrapper.setProps({ result: result() });
    expect(wrapper.get('.tool-card').attributes('data-status')).toBe('success');
    expect(wrapper.text()).toContain('page.ai.chat.toolExecutedRows');
    await wrapper.get('.tool-card-head').trigger('click');
    expect(wrapper.text()).toContain('user.lookup');
    expect(wrapper.text()).toContain('safe summary');
    expect(wrapper.text()).toContain('alice');
    expect(wrapper.text()).toContain('matches');
    expect(wrapper.get('.chip-link').attributes('href')).toContain('ai_query_id=tr-phase4');

    await wrapper.setProps({
      result: result({ ok: false, errorCode: 'AI_TOOL_PERMISSION_DENIED', errorMsg: 'raw backend detail' })
    });
    expect(wrapper.get('.tool-card').attributes('data-status')).toBe('failed');
    expect(wrapper.text()).toContain('AI_TOOL_PERMISSION_DENIED');
    expect(wrapper.text()).not.toContain('raw backend detail');
  });

  it('uses a generic business title for an unknown tool until technical details are opened', async () => {
    const wrapper = render({ started: started({ tool: 'custom.internal_action' }) });

    expect(wrapper.get('.tool-card-head').text()).toContain('page.ai.chat.toolOperation');
    expect(wrapper.get('.tool-card-head').text()).not.toContain('custom.internal_action');

    await wrapper.get('.tool-card-head').trigger('click');
    expect(wrapper.text()).toContain('custom.internal_action');
  });

  it('emits both HITL decisions and derives a server-time countdown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T08:00:00Z'));
    const wrapper = render({
      started: started({ risk: 'high' }),
      isPending: true,
      pendingExpiresAt: '2026-08-24T08:00:20Z'
    });

    expect(wrapper.get('.tool-card').attributes('data-status')).toBe('pending');
    expect(wrapper.text()).toContain('00:20');
    const buttons = wrapper.findAll('.hitl-action button');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('reject')).toHaveLength(1);
    expect(wrapper.emitted('approve')).toHaveLength(1);
    vi.advanceTimersByTime(2_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('00:18');
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('downloads only the current authorized UI projection', async () => {
    vi.useFakeTimers();
    requestMock.mockResolvedValue({ data: new Blob(['phase4']), error: null });
    const wrapper = render({
      started: started({ chipTarget: null }),
      result: result({
        ui: {
          viewType: 'detail_card',
          viewData: {
            title: 'Export ready',
            fields: [],
            downloadUrl: '/ai/tool-result/download/current-token',
            downloadFilename: 'phase4.xlsx'
          }
        }
      })
    });

    await wrapper.get('.chip-link--download').trigger('click');
    await flushPromises();
    expect(requestMock).toHaveBeenCalledWith({
      url: '/ai/tool-result/download/current-token',
      method: 'get',
      responseType: 'blob'
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:phase4');

    requestMock.mockResolvedValue({ data: null, error: new Error('revoked') });
    await wrapper.get('.chip-link--download').trigger('click');
    await flushPromises();
    expect((window as any).$message.error).toHaveBeenCalled();
  });

  it.each([
    // Existing download response error cases.
    { data: { code: 404, errorCode: 'AI_RESULT_DOWNLOAD_NOT_FOUND' }, error: null, response: { status: 404 } },
    { data: new Blob(['{"code":403}'], { type: 'application/json' }), error: null, response: { status: 200 } }
  ])('shows a persistent recovery hint for an invalid download response', async response => {
    requestMock.mockResolvedValue(response);
    const wrapper = render({
      started: started(),
      result: result({
        ui: {
          viewType: 'detail_card',
          viewData: {
            title: 'Export',
            fields: [],
            downloadUrl: '/ai/download/user-export/expired',
            downloadFilename: 'old.xlsx'
          }
        }
      })
    });
    await wrapper.get('.chip-link--download').trigger('click');
    await flushPromises();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain('page.ai.chat.downloadFailed');
    expect(wrapper.get('.chip-link--download').attributes('disabled')).toBeUndefined();
  });

  it('does not download a late response after its private card is removed', async () => {
    let finish!: (value: unknown) => void;
    requestMock.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const wrapper = render({
      started: started(),
      result: result({
        ui: {
          viewType: 'detail_card',
          viewData: { title: 'Export', fields: [], downloadUrl: '/ai/tool-result/download/private' }
        }
      })
    });
    await wrapper.get('.chip-link--download').trigger('click');
    wrapper.unmount();
    finish({ data: new Blob(['private']), error: null });
    await flushPromises();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('renders a registered detail view and safely formats null or cyclic arguments', async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const wrapper = render({
      started: started({ args: { empty: null, cyclic } }),
      result: result({
        ui: {
          viewType: 'detail_card',
          viewData: { title: 'Safe detail', fields: [{ label: 'count', value: 2 }] }
        }
      })
    });
    await wrapper.get('.tool-card-head').trigger('click');

    expect(wrapper.text()).toContain('Safe detail');
    expect(wrapper.text()).toContain('[object Object]');
  });
});

vi.mock('@/locales', () => ({ $t: (key: string) => key, localizedText: (raw: string) => raw }));
