import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
const initChart = vi.fn((_element?: HTMLElement) => chart);
const resizeObservers: Array<(entries: Array<{ contentRect: { width: number } }>) => void> = [];

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => `translated:${key}${params ? JSON.stringify(params) : ''}`,
    te: (key: string) => key.startsWith('i18n.')
  })
}));
vi.mock('@vueuse/core', () => ({
  useResizeObserver: (_target: unknown, callback: (entries: Array<{ contentRect: { width: number } }>) => void) => {
    resizeObservers.push(callback);
  }
}));
vi.mock('echarts/core', () => ({ use: vi.fn(), init: (element: HTMLElement) => initChart(element) }));
vi.mock('echarts/charts', () => ({ BarChart: {}, PieChart: {} }));
vi.mock('echarts/components', () => ({ GridComponent: {}, LegendComponent: {}, TooltipComponent: {} }));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));

import DataListView from '../tool-views/DataListView.vue';
import DetailCardView from '../tool-views/DetailCardView.vue';
import PlainJsonView from '../tool-views/PlainJsonView.vue';
import RowsAffectedView from '../tool-views/RowsAffectedView.vue';
import StatsChartView from '../tool-views/StatsChartView.vue';
import { resolveToolView } from '../tool-views';

function ui(viewType: string, viewData: unknown, extra: Record<string, unknown> = {}) {
  return { viewType, viewData, ...extra } as Api.Ai.UIResult;
}

describe('structured tool result views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resizeObservers.length = 0;
  });

  it('renders localized columns and localized enum cells', () => {
    const wrapper = mount(DataListView, {
      props: {
        data: ui('data_list', {
          columns: [
            { key: 'name', label: 'i18n.name' },
            { key: 'status', label: 'Raw status' }
          ],
          rows: [{ name: 'Alice', status: 'i18n.enabled' }]
        })
      }
    });
    expect(wrapper.text()).toContain('i18n.name');
    expect(wrapper.text()).toContain('Raw status');
    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.findAll('td')[1].text()).toBe('translated:i18n.enabled');
  });

  it('renders detail and row-count labels with and without server label keys', async () => {
    const detail = mount(DetailCardView, {
      props: {
        data: ui(
          'detail_card',
          {
            title: 'Fallback title',
            fields: [
              { label: 'i18n.field', value: 'safe' },
              { label: 'i18n.status', value: 'i18n.disabled' }
            ]
          },
          { labelKey: 'i18n.detail', labelParams: { count: 1 } }
        )
      }
    });
    expect(detail.text()).toContain('i18n.detail');
    expect(detail.text()).toContain('i18n.field');
    expect(detail.findAll('code')[0].text()).toBe('safe');
    expect(detail.findAll('code')[1].text()).toBe('translated:i18n.disabled');

    const rows = mount(RowsAffectedView, {
      props: {
        data: ui(
          'rows_affected',
          { count: 2, ids: ['1', '2'] },
          { labelKey: 'i18n.rows', labelParams: { kind: 'user' } }
        )
      }
    });
    expect(rows.text()).toContain('i18n.rows');
    expect(rows.text()).toContain('1, 2');
    await rows.setProps({ data: ui('rows_affected', { count: 0, ids: [] }) });
    expect(rows.text()).toContain('page.ai.chat.rowsAffected');
    expect(rows.find('details').exists()).toBe(false);
  });

  it('serializes plain JSON and degrades cyclic values without throwing', async () => {
    const wrapper = mount(PlainJsonView, { props: { data: ui('plain_json', { safe: true }) } });
    expect(wrapper.text()).toContain('"safe": true');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    await wrapper.setProps({ data: ui('plain_json', cyclic) });
    expect(wrapper.text()).toBe('[object Object]');
  });

  it('resolves registered views and fails unknown view types to plain JSON', () => {
    expect(resolveToolView('data_list')).toBe(DataListView);
    expect(resolveToolView(undefined)).toBe(PlainJsonView);
    expect(resolveToolView('unknown' as Api.Ai.ViewType)).toBe(PlainJsonView);
  });

  it('normalizes aggregate labels, percentages, charts, resize, and cleanup', async () => {
    const wrapper = mount(StatsChartView, {
      props: {
        data: ui('stats_chart', {
          rows: [
            { group: '', count: 0 },
            { group: '1', count: 2 },
            { group: '2', count: 1 },
            { group: 'male', count: 1 },
            { group: 'female', count: 1 },
            { group: 'custom', count: 1 }
          ]
        })
      }
    });
    expect(wrapper.text()).toContain('page.ai.chat.statsUnknown');
    expect(wrapper.text()).toContain('page.ai.chat.statsMale');
    expect(wrapper.text()).toContain('page.ai.chat.statsFemale');
    expect(wrapper.text()).toContain('custom');
    expect(wrapper.text()).toContain('33%');

    const tabs = wrapper.findAll('.stats-tab');
    await tabs[1].trigger('click');
    await flushPromises();
    expect(initChart).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalled();
    expect(chart.resize).toHaveBeenCalled();
    resizeObservers[0]([{ contentRect: { width: 0 } }]);
    resizeObservers[0]([{ contentRect: { width: 500 } }]);

    await tabs[2].trigger('click');
    await flushPromises();
    expect(initChart).toHaveBeenCalledTimes(2);
    resizeObservers[1]([{ contentRect: { width: 500 } }]);
    await tabs[0].trigger('click');

    await wrapper.setProps({ data: ui('stats_chart', { rows: [{ group: 'null', count: 0 }] }) });
    expect(wrapper.text()).toContain('0%');
    wrapper.unmount();
    expect(chart.dispose).toHaveBeenCalledTimes(2);
  });
});
