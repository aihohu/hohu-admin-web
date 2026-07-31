import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

// External wrappers so the mock factory can capture calls.
const summaryMock = vi.fn().mockResolvedValue({
  error: null,
  data: {
    total: 0,
    correct: 0,
    wrong: 0,
    wrongRate: 0,
    topWrongAgents: []
  }
});

const listMock = vi.fn().mockResolvedValue({
  error: null,
  data: { records: [], total: 0, current: 1, size: 20 }
});

vi.mock('@/service/api', () => ({
  fetchRoutingFeedbackSummary: (...args: unknown[]) => summaryMock(...args),
  fetchRoutingFeedbackList: (...args: unknown[]) => listMock(...args)
}));

vi.mock('@/locales', () => ({
  $t: (k: string) => k
}));

// Slot-passing templates for container components (so findAll works);
// true stubs for leaf components.
const stubs = {
  NSpace: { template: '<div><slot/></div>' },
  NCard: { template: '<div><slot/></div>' },
  NRadioGroup: { template: '<div><slot/></div>' },
  NGrid: { template: '<div><slot/></div>' },
  NGridItem: { template: '<div><slot/></div>' },
  NRadio: true,
  NStatistic: true,
  NDataTable: true,
  NInput: true
};

import RoutingFeedbackDashboard from '../index.vue';

describe('routing-feedback dashboard', () => {
  beforeEach(() => {
    summaryMock.mockClear();
    listMock.mockClear();
  });

  it('mount 触发 summary 与 list 并行加载（默认 7 天）', async () => {
    mount(RoutingFeedbackDashboard, { global: { stubs } });
    await flushPromises();

    expect(summaryMock).toHaveBeenCalledTimes(1);
    expect(summaryMock).toHaveBeenCalledWith(7);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect((listMock.mock.calls[0] as unknown[])[0]).toMatchObject({ days: 7 });
  });

  it('切换 7↔30 天触发重新拉取', async () => {
    const wrapper = mount(RoutingFeedbackDashboard, { global: { stubs } });
    await flushPromises();
    summaryMock.mockClear();
    listMock.mockClear();

    const vm = wrapper.vm as unknown as { days: 7 | 30 };
    vm.days = 30;
    await flushPromises();

    expect(summaryMock).toHaveBeenCalledTimes(1);
    expect(summaryMock).toHaveBeenCalledWith(30);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect((listMock.mock.calls[0] as unknown[])[0]).toMatchObject({ days: 30 });
  });
});
