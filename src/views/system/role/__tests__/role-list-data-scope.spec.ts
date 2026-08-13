import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} })
}));

vi.mock('@sa/hooks', () => ({
  useBoolean: () => ({ bool: ref(false), setTrue: vi.fn() })
}));

vi.mock('@/service/api', () => ({
  fetchBatchDeleteRole: vi.fn(),
  fetchDeleteRole: vi.fn(),
  fetchGetRoleList: vi.fn().mockResolvedValue({
    error: null,
    data: { records: [], total: 0, current: 1, size: 10 }
  })
}));

vi.mock('@/service/api/ai', () => ({
  fetchAiQueryCache: vi.fn()
}));

vi.mock('@/store/modules/app', () => ({
  useAppStore: () => ({ isMobile: false })
}));

vi.mock('@/hooks/business/auth', () => ({
  useAuth: () => ({ hasAuth: () => false })
}));

vi.mock('@/hooks/common/table', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/common/table')>();
  return {
    ...original,
    useNaivePaginatedTable: (options: { columns: () => NaiveUI.TableColumn<Api.SystemManage.Role>[] }) => ({
      columns: ref(options.columns()),
      columnChecks: ref([]),
      data: ref([]),
      loading: ref(false),
      getData: vi.fn(),
      getDataByPage: vi.fn(),
      mobilePagination: computed(() => ({}))
    }),
    useTableOperate: () => ({
      drawerVisible: ref(false),
      operateType: ref('add'),
      editingData: ref(null),
      handleAdd: vi.fn(),
      handleEdit: vi.fn(),
      checkedRowKeys: ref([]),
      onBatchDeleted: vi.fn(),
      onDeleted: vi.fn()
    })
  };
});

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

const NDataTableStub = defineComponent({
  name: 'NDataTable',
  props: {
    columns: { type: Array, required: true },
    tableLayout: { type: String, default: undefined }
  },
  template: '<div />'
});

import RoleList from '../index.vue';

describe('role list data scope', () => {
  it('表格按翻译内容自适应列宽且操作文案不换行', async () => {
    const wrapper = mount(RoleList, {
      global: {
        stubs: {
          RoleSearch: true,
          NCard: { template: '<div><slot /><slot name="header-extra" /></div>' },
          TableHeaderOperation: true,
          NDataTable: NDataTableStub,
          RoleOperateDrawer: true,
          MenuAuthModal: true,
          AiAgentAuthModal: true
        }
      }
    });
    await flushPromises();

    const columns = wrapper
      .findComponent(NDataTableStub)
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.Role>[];
    const dataScopeColumn = columns.find(column => 'key' in column && column.key === 'dataScope');
    const operateColumn = columns.find(column => 'key' in column && column.key === 'operate');
    const rendered =
      operateColumn && 'render' in operateColumn
        ? operateColumn.render?.({ roleId: '1', roleCode: 'R_TEST' } as Api.SystemManage.Role, 0)
        : null;

    expect(wrapper.findComponent(NDataTableStub).props('tableLayout')).toBe('auto');
    expect(dataScopeColumn && 'minWidth' in dataScopeColumn ? dataScopeColumn.minWidth : null).toBe(140);
    expect(operateColumn && 'minWidth' in operateColumn ? operateColumn.minWidth : null).toBe(360);
    expect(operateColumn && 'width' in operateColumn ? operateColumn.width : undefined).toBeUndefined();
    expect((rendered as unknown as { props: { class: string } }).props.class).toContain('whitespace-nowrap');
  });

  it('显示数据权限列并按权限值渲染对应文案', async () => {
    const wrapper = mount(RoleList, {
      global: {
        stubs: {
          RoleSearch: true,
          NCard: { template: '<div><slot /><slot name="header-extra" /></div>' },
          TableHeaderOperation: true,
          NDataTable: NDataTableStub,
          RoleOperateDrawer: true,
          MenuAuthModal: true,
          AiAgentAuthModal: true
        }
      }
    });
    await flushPromises();

    const columns = wrapper
      .findComponent(NDataTableStub)
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.Role>[];
    const dataScopeColumn = columns.find(column => 'key' in column && column.key === 'dataScope');
    const rendered =
      dataScopeColumn && 'render' in dataScopeColumn
        ? dataScopeColumn.render?.({ dataScope: '2' } as Api.SystemManage.Role, 0)
        : null;

    expect(dataScopeColumn && 'title' in dataScopeColumn ? dataScopeColumn.title : null).toBe(
      'page.system.role.dataScope.label'
    );
    expect(rendered).toMatchObject({ children: { default: expect.any(Function) } });
    expect((rendered as unknown as { children: { default: () => string[] } }).children.default()).toEqual([
      'page.system.role.dataScope.custom'
    ]);
  });
});
