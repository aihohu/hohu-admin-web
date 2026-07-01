<script setup lang="tsx">
import { reactive, shallowRef } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { enableStatusRecord } from '@/constants/business';
import { fetchDeleteDataScopeDemo, fetchGetDataScopeDemoList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import DataScopeDemoSearch from './modules/data-scope-demo-search.vue';
import DataScopeDemoOperateDrawer from './modules/data-scope-demo-operate-drawer.vue';

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams: Api.SystemManage.DataScopeDemoSearchParams = reactive({
  current: 1,
  size: 10,
  title: null,
  status: null
});

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetDataScopeDemoList(searchParams),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.current = params.page;
    searchParams.size = params.pageSize;
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'title',
      title: $t('page.system.dataScopeDemo.title_field'),
      minWidth: 160
    },
    {
      key: 'content',
      title: $t('page.system.dataScopeDemo.content'),
      minWidth: 240,
      ellipsis: { tooltip: true }
    },
    {
      key: 'deptId',
      title: $t('page.system.dataScopeDemo.deptId'),
      align: 'center',
      width: 200
    },
    {
      key: 'createBy',
      title: $t('page.system.dataScopeDemo.createBy'),
      align: 'center',
      width: 200
    },
    {
      key: 'status',
      title: $t('page.system.dataScopeDemo.status'),
      align: 'center',
      width: 100,
      render: row => {
        if (row.status === null) {
          return null;
        }
        const tagMap: Record<Api.Common.EnableStatus, NaiveUI.ThemeColor> = {
          1: 'success',
          2: 'warning'
        };
        const label = $t(enableStatusRecord[row.status]);
        return <NTag type={tagMap[row.status]}>{label}</NTag>;
      }
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 180,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('system:data-scope-demo:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.demoId)}>
              {$t('common.edit')}
            </NButton>
          )}
          {hasAuth('system:data-scope-demo:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.demoId)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t('common.delete')}
                  </NButton>
                )
              }}
            </NPopconfirm>
          )}
        </div>
      )
    }
  ]
});

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onDeleted
} = useTableOperate(data, 'demoId', getData);

async function handleDelete(id: string) {
  const { error } = await fetchDeleteDataScopeDemo(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}

// 顶部演示提示卡片可关闭
const { bool: showHint, setFalse: closeHint } = useBoolean(true);

const hintAccounts = shallowRef([
  { name: 'demo_all', scope: 'ALL 全部数据' },
  { name: 'demo_dept_sub', scope: 'DEPT_AND_SUB 本部门及以下' },
  { name: 'demo_dept', scope: 'DEPT 仅本部门' },
  { name: 'demo_custom', scope: 'CUSTOM 自定义部门' },
  { name: 'demo_self', scope: 'SELF 仅本人创建' }
]);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NAlert v-if="showHint" type="info" :bordered="false" closable @close="closeHint">
      <template #header>
        <span class="font-medium">{{ $t('page.system.dataScopeDemo.subTitle') }}</span>
      </template>
      <div class="mb-2">{{ $t('page.system.dataScopeDemo.demoAccountHint') }}</div>
      <div class="flex flex-wrap gap-12px">
        <NTag v-for="acc in hintAccounts" :key="acc.name" type="success">
          {{ acc.name }} / demo@12345
          <span class="ml-6px opacity-70">({{ acc.scope }})</span>
        </NTag>
      </div>
    </NAlert>

    <DataScopeDemoSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.dataScopeDemo.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          add-auth="system:data-scope-demo:add"
          @add="handleAdd"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1100"
        :loading="loading"
        remote
        :row-key="row => row.demoId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <DataScopeDemoOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
