import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import JobPage from '../../index.vue';

const api = vi.hoisted(() => ({ run: vi.fn(), refresh: vi.fn() }));
vi.mock('@/service/api', () => ({
  fetchRunJobNow: api.run,
  fetchGetJobList: vi.fn(),
  fetchBatchDeleteJob: vi.fn(),
  fetchDeleteJob: vi.fn(),
  fetchUpdateJobStatus: vi.fn()
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
vi.mock('@/store/modules/app', () => ({ useAppStore: () => ({ isMobile: false }) }));
vi.mock('@/hooks/business/auth', () => ({ useAuth: () => ({ hasAuth: () => true }) }));
vi.mock('@/hooks/common/table', () => ({
  defaultTransform: vi.fn(),
  useNaivePaginatedTable: (options: { columns: () => unknown[] }) => ({
    columns: ref(options.columns()),
    columnChecks: ref([]),
    data: ref([{ jobId: '1', fieldPolicy: { update: [], specialUpdate: [], controlActions: { canRun: true } } }]),
    getData: api.refresh,
    getDataByPage: vi.fn(),
    loading: ref(false),
    mobilePagination: ref({})
  }),
  useTableOperate: () => ({
    drawerVisible: ref(false),
    operateType: ref('edit'),
    editingData: ref(null),
    handleAdd: vi.fn(),
    handleEdit: vi.fn(),
    checkedRowKeys: ref([]),
    onDeleted: vi.fn()
  })
}));
const table = defineComponent({
  props: ['columns', 'data'],
  setup: props => () =>
    h(
      'div',
      props.data.flatMap((row: object) =>
        props.columns.map((col: { render?: (row: object) => unknown }) => col.render?.(row))
      )
    )
});
const stubs = {
  NCard: { template: '<main><slot /></main>' },
  NDataTable: table,
  Popconfirm: {
    emits: ['positive-click'],
    template:
      '<div class="confirmation"><slot name="trigger" /><button class="positive" @click="$emit(\'positive-click\')">Confirm</button></div>'
  },
  Button: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
  JobOperateDrawer: true,
  JobSearch: true,
  TableHeaderOperation: true
};
describe('task run interaction budget', () => {
  it('sends only one run while confirmation is pending', async () => {
    let finish!: (value: unknown) => void;
    api.run.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const wrapper = mount(JobPage, { global: { stubs } });
    const confirmation = wrapper.findAll('.confirmation').find(part => part.text().includes('page.system.job.runNow'))!;
    await confirmation.get('.positive').trigger('click');
    await confirmation.get('.positive').trigger('click');
    expect(api.run).toHaveBeenCalledTimes(1);
    finish({ data: { notificationStatus: 'notified' }, error: null });
    await flushPromises();
    wrapper.unmount();
  });
});
