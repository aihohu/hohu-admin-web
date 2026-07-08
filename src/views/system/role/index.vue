<script setup lang="tsx">
import { onMounted, reactive, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { enableStatusRecord } from '@/constants/business';
import { fetchBatchDeleteRole, fetchDeleteRole, fetchGetRoleList } from '@/service/api';
import { fetchAiQueryCache } from '@/service/api/ai';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';
import MenuAuthModal from './modules/menu-auth-modal.vue';

const appStore = useAppStore();
const { hasAuth } = useAuth();
const route = useRoute();
const { bool: menuAuthVisible, setTrue: openMenuAuthModal } = useBoolean();

const currentRoleId = shallowRef<string>('');

const searchParams: Api.SystemManage.RoleSearchParams = reactive({
  current: 1,
  size: 10,
  roleName: null,
  roleCode: null,
  status: null
});

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetRoleList(searchParams),
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
      key: 'roleName',
      title: $t('page.system.role.roleName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'roleCode',
      title: $t('page.system.role.roleCode'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'roleDesc',
      title: $t('page.system.role.roleDesc'),
      minWidth: 120
    },
    {
      key: 'status',
      title: $t('page.system.role.roleStatus'),
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
      width: 260,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('system:role:menu-auth') && (
            <NButton type="info" ghost size="small" onClick={() => onMenuAuthClick(row.roleId)}>
              {$t('page.system.role.menuAuth')}
            </NButton>
          )}
          {hasAuth('system:role:edit') && (
            <NButton type="primary" ghost size="small" onClick={() => edit(row.roleId)}>
              {$t('common.edit')}
            </NButton>
          )}
          {hasAuth('system:role:delete') && (
            <NPopconfirm onPositiveClick={() => handleDelete(row.roleId)}>
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
  onBatchDeleted,
  onDeleted
  // closeDrawer
} = useTableOperate(data, 'roleId', getData);

// §8.7 chip 跳转回放：URL 含 ?ai_query_id 时调 query-cache 应用 filters
onMounted(async () => {
  const aiQueryId = route.query.ai_query_id;
  if (typeof aiQueryId !== 'string' || !aiQueryId) return;
  const { data: cache, error } = await fetchAiQueryCache(aiQueryId);
  if (error || !cache) return;
  const filters = cache.filters || {};
  if (filters.status === '1' || filters.status === '2') {
    searchParams.status = filters.status;
  }
  await getData();
});

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteRole(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteRole(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}

function onMenuAuthClick(id: string) {
  currentRoleId.value = id;
  openMenuAuthModal();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.role.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          add-auth="system:role:add"
          delete-auth="system:role:batch-delete"
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
        :scroll-x="702"
        :loading="loading"
        remote
        :row-key="row => row.roleId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>

    <MenuAuthModal v-model:visible="menuAuthVisible" :role-id="currentRoleId" />
  </div>
</template>

<style scoped></style>
