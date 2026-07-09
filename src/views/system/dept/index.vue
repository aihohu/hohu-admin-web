<script setup lang="tsx">
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { FlatResponseData } from '@sa/axios';
import { jsonClone } from '@sa/utils';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { fetchBatchDeleteDept, fetchDeleteDept, fetchGetDeptTree } from '@/service/api';
import { fetchAiQueryCache } from '@/service/api/ai';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import DeptOperateDrawer from './modules/dept-operate-drawer.vue';
import DeptSearch from './modules/dept-search.vue';
import DeptUsersModal from './modules/dept-users-modal.vue';

const appStore = useAppStore();
const { hasAuth } = useAuth();
const route = useRoute();

const searchParams: Api.SystemManage.DeptSearchParams = reactive({
  deptName: null,
  status: null,
  leader: null
});

const { columns, columnChecks, data, loading, getData, scrollX } = useNaiveTable<
  FlatResponseData<any, Api.SystemManage.DeptTree[]>,
  Api.SystemManage.DeptTree
>({
  api: () => fetchGetDeptTree(searchParams),
  transform: response => {
    const { data: treeData, error } = response;
    if (!error) {
      return treeData || [];
    }
    return [];
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'deptName',
      title: $t('page.system.dept.deptName'),
      align: 'left',
      minWidth: 160
    },
    {
      key: 'orderNum',
      title: $t('page.system.dept.orderNum'),
      align: 'center',
      width: 80
    },
    {
      key: 'leader',
      title: $t('page.system.dept.leader'),
      align: 'center',
      minWidth: 100
    },
    {
      key: 'phone',
      title: $t('page.system.dept.phone'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'email',
      title: $t('page.system.dept.email'),
      align: 'center',
      minWidth: 160
    },
    {
      key: 'status',
      title: $t('page.system.dept.deptStatus'),
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
      key: 'createTime',
      title: $t('page.system.dept.createTime'),
      align: 'center',
      minWidth: 160
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 280,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('system:dept:edit') && (
            <NButton type="success" ghost size="small" onClick={() => manageUsers(row.deptId)}>
              {$t('page.system.dept.manageUsers')}
            </NButton>
          )}
          {hasAuth('system:dept:add') && (
            <NButton type="info" ghost size="small" onClick={() => addChild(row.deptId)}>
              {$t('page.system.dept.addChildDept')}
            </NButton>
          )}
          {hasAuth('system:dept:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.deptId)}>
              {$t('common.edit')}
            </NButton>
          )}
          {hasAuth('system:dept:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.deptId)}>
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
  openDrawer,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
} = useTableOperate(data, 'deptId', getData);

/** users modal state */
const usersModalVisible = ref(false);
const usersModalDeptId = ref<string>('');

// §8.7 chip 跳转回放：URL 含 ?ai_query_id 时调 query-cache 应用 filters
onMounted(async () => {
  const aiQueryId = route.query.ai_query_id;
  if (typeof aiQueryId !== 'string' || !aiQueryId) return;
  const { data: cache, error } = await fetchAiQueryCache(aiQueryId);
  if (error) {
    window.$message?.error('筛选回放加载失败');
    return;
  }
  if (!cache) {
    window.$message?.info('筛选条件已过期（5 分钟），请重新发起查询');
    return;
  }
  const filters = cache.filters || {};
  if (filters.status === '1' || filters.status === '0') {
    searchParams.status = filters.status;
  }
  await getData();
});

function manageUsers(deptId: string) {
  usersModalDeptId.value = deptId;
  usersModalVisible.value = true;
}

/** recursively find node in tree */
function findInTree(tree: Api.SystemManage.DeptTree[], id: string): Api.SystemManage.DeptTree | null {
  for (const node of tree) {
    if (node.deptId === id) return node;
    if (node.children?.length) {
      const found = findInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** override edit: use recursive tree search */
function edit(id: string) {
  operateType.value = 'edit';
  const findItem = findInTree(data.value, id);
  editingData.value = jsonClone(findItem);
  openDrawer();
}

/** add child dept: new mode with parentId preset */
function addChild(parentId: string) {
  operateType.value = 'add';
  editingData.value = { parentId } as any;
  openDrawer();
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteDept(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteDept(id);
  if (!error) {
    onDeleted();
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <DeptSearch v-model:model="searchParams" @search="getData" />
    <NCard :title="$t('page.system.dept.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          add-auth="system:dept:add"
          delete-auth="system:dept:batch-delete"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="row => row.deptId"
        default-expand-all
        class="sm:h-full"
      />
      <DeptOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
      <DeptUsersModal v-model:visible="usersModalVisible" :dept-id="usersModalDeptId" @updated="getData" />
    </NCard>
  </div>
</template>

<style scoped></style>
