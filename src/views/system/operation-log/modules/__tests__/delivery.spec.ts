import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Detail from '../operation-log-detail-modal.vue';
import Search from '../operation-log-search.vue';

vi.mock('@/locales', () => ({ $t: (key: string) => key }));
const box = { template: '<div><slot /></div>' };
const global = {
  stubs: {
    NModal: box,
    NCard: box,
    NCollapse: box,
    NCollapseItem: box,
    NForm: box,
    NGrid: box,
    NFormItemGi: box,
    NDescriptions: box,
    NDescriptionsItem: box,
    NCode: true,
    NEmpty: true,
    NDivider: true,
    NInput: true,
    NSelect: true,
    NDatePicker: true,
    NButton: true
  }
};

describe('audit delivery controls', () => {
  it('disables queries until the current capability permits them', () => {
    const wrapper = mount(Search, { global, props: { model: { current: 1, size: 10 }, queryFields: [] } });
    for (const name of ['NInput', 'NSelect', 'NDatePicker']) {
      for (const component of wrapper.findAllComponents({ name }))
        expect(component.attributes('disabled')).toBeDefined();
    }
  });
  it('does not expose an old free-text audit copy', () => {
    const wrapper = mount(Detail, {
      global,
      props: {
        visible: true,
        rowData: {
          operationLogId: '1',
          requestParams: '{"secret":"OLD PRIVATE COPY"}',
          fieldPolicy: { read: [], query: [] }
        }
      }
    });
    expect(wrapper.html()).not.toContain('OLD PRIVATE COPY');
  });
});
