<script setup lang="tsx">
import { reactive } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import {
  fetchBatchDeleteDictType,
  fetchDeleteDictType,
  fetchGetDictTypeList
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import { useRouter } from 'vue-router';
import { $t } from '@/locales';
import DictTypeOperateDrawer from './modules/dict-type-operate-drawer.vue';
import DictTypeSearch from './modules/dict-type-search.vue';

defineOptions({
  name: 'SystemDict'
});

const router = useRouter();
const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams: Api.SystemManage.DictTypeSearchParams = reactive({
  current: 1,
  size: 10,
  status: null,
  dictName: null,
  dictType: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetDictTypeList(searchParams),
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
        align: 'center',
        width: 64,
        render: (_, index) => index + 1
      },
      {
        key: 'dictName',
        title: $t('page.system.dict.dictTypeName'),
        align: 'center',
        minWidth: 150
      },
      {
        key: 'dictType',
        title: $t('page.system.dict.dictTypeCode'),
        align: 'center',
        minWidth: 150
      },
      {
        key: 'status',
        title: $t('page.system.dict.status'),
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
        key: 'remark',
        title: $t('page.system.dict.remark'),
        align: 'center',
        minWidth: 200,
        ellipsis: {
          tooltip: true
        }
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 300,
        render: row => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => edit(row.dictTypeId)}>
              {$t('common.edit')}
            </NButton>

            <NButton type="info" ghost size="small" onClick={() => viewDictData(row)}>
              {$t('page.system.dict.viewDictData')}
            </NButton>

            {hasAuth('system:dict:delete') && (
              <NPopconfirm onPositiveClick={() => handleDelete(row.dictTypeId)}>
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
} = useTableOperate(data, 'dictTypeId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteDictType(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: number) {
  const { error } = await fetchDeleteDictType(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: number) {
  handleEdit(id);
}

function viewDictData(row: Api.SystemManage.DictType) {
  router.push({
    name: 'system_dict_data',
    params: { dictType: row.dictType }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <DictTypeSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.dict.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
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
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="row => row.dictTypeId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <DictTypeOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
