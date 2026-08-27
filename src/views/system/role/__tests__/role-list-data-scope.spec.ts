import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, ref } from 'vue';

const routeHarness = vi.hoisted(() => ({ query: {} as Record<string, unknown> }));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeHarness.query })
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
  }),
  fetchGetRoleDetail: vi.fn()
}));

vi.mock('@/service/api/ai', () => ({
  fetchAiQueryCache: vi.fn()
}));

vi.mock('@/store/modules/app', () => ({
  useAppStore: () => ({ isMobile: false })
}));

const authState = vi.hoisted(() => ({
  permissions: new Set<string>(),
  superAdmin: false
}));

vi.mock('@/hooks/business/auth', () => ({
  useAuth: () => ({
    hasAuth: (code: string) => authState.permissions.has(code),
    hasSuperAdminAuth: (code: string) => authState.superAdmin && authState.permissions.has(code)
  })
}));

vi.mock('@/hooks/common/table', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/common/table')>();
  return {
    ...original,
    useNaivePaginatedTable: (options: { columns: () => NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[] }) => ({
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
      openDrawer: vi.fn(),
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

const TableHeaderOperationStub = defineComponent({
  name: 'TableHeaderOperation',
  props: {
    showDelete: Boolean
  },
  template: '<div />'
});

import RoleList from '../index.vue';

describe('role list data scope', () => {
  beforeEach(() => {
    authState.permissions.clear();
    authState.superAdmin = false;
    routeHarness.query = {};
    window.$message = { error: vi.fn(), info: vi.fn() } as unknown as typeof window.$message;
  });

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
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[];
    const dataScopeColumn = columns.find(column => 'key' in column && column.key === 'dataScope');
    const operateColumn = columns.find(column => 'key' in column && column.key === 'operate');
    const rendered =
      operateColumn && 'render' in operateColumn
        ? operateColumn.render?.(
            { roleId: '1', roleCode: 'R_TEST', delegable: true } as Api.SystemManage.RoleSummary,
            0
          )
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
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[];
    const dataScopeColumn = columns.find(column => 'key' in column && column.key === 'dataScope');
    const rendered =
      dataScopeColumn && 'render' in dataScopeColumn
        ? dataScopeColumn.render?.({ dataScope: '2' } as Api.SystemManage.RoleSummary, 0)
        : null;

    expect(dataScopeColumn && 'title' in dataScopeColumn ? dataScopeColumn.title : null).toBe(
      'page.system.role.dataScope.label'
    );
    expect(rendered).toMatchObject({ children: { default: expect.any(Function) } });
    expect((rendered as unknown as { children: { default: () => string[] } }).children.default()).toEqual([
      'page.system.role.dataScope.custom'
    ]);
  });

  it('hides single and batch delete controls from non-super administrators', async () => {
    authState.permissions.add('system:role:delete');
    authState.permissions.add('system:role:batch-delete');
    const wrapper = mount(RoleList, {
      global: {
        stubs: {
          RoleSearch: true,
          NCard: { template: '<div><slot /><slot name="header-extra" /></div>' },
          TableHeaderOperation: TableHeaderOperationStub,
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
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[];
    const operateColumn = columns.find(column => 'key' in column && column.key === 'operate');
    const rendered =
      operateColumn && 'render' in operateColumn
        ? operateColumn.render?.(
            { roleId: '1', roleCode: 'R_TEST', delegable: true } as Api.SystemManage.RoleSummary,
            0
          )
        : null;
    const children = (rendered as unknown as { children: unknown[] }).children;

    expect(wrapper.findComponent(TableHeaderOperationStub).props('showDelete')).toBe(false);
    expect(children.filter(Boolean)).toHaveLength(0);
  });

  it('hides delegated write actions when the live role summary is blocked', async () => {
    authState.permissions.add('system:role:edit');
    authState.permissions.add('system:role:menu-auth');
    authState.permissions.add('system:role:ai-agent-auth');
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
      .props('columns') as NaiveUI.TableColumn<Api.SystemManage.RoleSummary>[];
    const operateColumn = columns.find(column => 'key' in column && column.key === 'operate');
    const rendered =
      operateColumn && 'render' in operateColumn
        ? operateColumn.render?.(
            { roleId: '1', roleCode: 'R_BLOCKED', delegable: false } as Api.SystemManage.RoleSummary,
            0
          )
        : null;
    const children = (rendered as unknown as { children: unknown[] }).children;

    expect(children.filter(Boolean)).toHaveLength(0);
  });

  it('renders status and every permitted delegated or super-admin action', async () => {
    authState.superAdmin = true;
    for (const permission of [
      'system:role:menu-auth',
      'system:role:ai-agent-auth',
      'system:role:edit',
      'system:role:delete',
      'system:role:batch-delete'
    ]) {
      authState.permissions.add(permission);
    }
    const wrapper = mount(RoleList, {
      global: {
        stubs: {
          RoleSearch: true,
          NCard: { template: '<div><slot /><slot name="header-extra" /></div>' },
          TableHeaderOperation: TableHeaderOperationStub,
          NDataTable: NDataTableStub,
          RoleOperateDrawer: true,
          MenuAuthModal: true,
          AiAgentAuthModal: true
        }
      }
    });
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    const statusColumn = state.columns.find((column: Record<string, unknown>) => column.key === 'status');
    const operateColumn = state.columns.find((column: Record<string, unknown>) => column.key === 'operate');
    const indexColumn = state.columns.find((column: Record<string, unknown>) => column.key === 'index');
    expect(indexColumn.render({}, 2)).toBe(3);
    expect(statusColumn.render({ status: null }, 0)).toBeNull();
    expect(statusColumn.render({ status: '1' }, 0).props.type).toBe('success');
    expect(statusColumn.render({ status: '2' }, 0).props.type).toBe('warning');
    const rendered = operateColumn.render({ roleId: '9', roleCode: 'R_ALL', delegable: true }, 0);
    expect(rendered.children.filter(Boolean)).toHaveLength(4);
    expect(wrapper.findComponent(TableHeaderOperationStub).props('showDelete')).toBe(true);

    state.onMenuAuthClick('9');
    state.onAiAgentAuthClick('9');
    expect(state.currentRoleId).toBe('9');
    expect(state.aiAgentAuthRoleId).toBe('9');
  });

  it('handles delete, batch delete, and edit API success and error outcomes', async () => {
    const { fetchBatchDeleteRole, fetchDeleteRole, fetchGetRoleDetail } = await import('@/service/api');
    vi.mocked(fetchBatchDeleteRole)
      .mockResolvedValueOnce({ data: null, error: new Error('batch') } as never)
      .mockResolvedValueOnce({ data: null, error: null } as never);
    vi.mocked(fetchDeleteRole)
      .mockResolvedValueOnce({ data: null, error: new Error('delete') } as never)
      .mockResolvedValueOnce({ data: null, error: null } as never);
    vi.mocked(fetchGetRoleDetail)
      .mockResolvedValueOnce({ data: null, error: new Error('detail') } as never)
      .mockResolvedValueOnce({ data: null, error: null } as never)
      .mockResolvedValueOnce({
        data: {
          roleId: '9',
          roleName: 'Scoped role',
          roleCode: 'R_SCOPED',
          roleDesc: null,
          dataScope: '1',
          status: '1',
          createTime: ''
        } as unknown as Api.SystemManage.Role,
        error: null
      } as never);
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
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    await state.handleBatchDelete();
    await state.handleBatchDelete();
    await state.handleDelete('9');
    await state.handleDelete('9');
    await state.edit('9');
    await state.edit('9');
    await state.edit('9');
    expect(state.operateType).toBe('edit');
    expect(state.editingRole.roleId).toBe('9');
  });

  it.each([
    [{ ai_query_id: 'cache-error' }, { data: null, error: new Error('cache') }, 'error'],
    [{ ai_query_id: 'cache-missing' }, { data: null, error: null }, 'info'],
    [{ ai_query_id: 'cache-empty' }, { data: {}, error: null }, null],
    [{ ai_query_id: 'cache-invalid' }, { data: { filters: { status: '3' } }, error: null }, null],
    [{ ai_query_id: 'cache-status-one' }, { data: { filters: { status: '1' } }, error: null }, null],
    [{ ai_query_id: 'cache-valid' }, { data: { filters: { status: '2' } }, error: null }, null]
  ])('replays cached AI filters with explicit unavailable states', async (query, result, messageKind) => {
    const { fetchAiQueryCache } = await import('@/service/api/ai');
    routeHarness.query = query;
    vi.mocked(fetchAiQueryCache).mockResolvedValueOnce(result as never);
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
    const state = (wrapper.vm.$ as unknown as { setupState: Record<string, any> }).setupState;
    if (messageKind) expect(window.$message?.[messageKind as 'error' | 'info']).toHaveBeenCalled();
    if (query.ai_query_id === 'cache-valid') expect(state.searchParams.status).toBe('2');
    if (query.ai_query_id === 'cache-status-one') expect(state.searchParams.status).toBe('1');
  });
});
