<script setup lang="tsx">
import { reactive, onMounted, computed, shallowRef } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import {
  fetchBatchDeleteDictData,
  fetchDeleteDictData,
  fetchGetDictDataList
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { fieldAllowed } from '@/hooks/business/ordinary-fields';
import { useRoute } from 'vue-router';
import DictDataOperateDrawer from '../modules/dict-data-operate-drawer.vue';
import DictDataSearch from '../modules/dict-data-search.vue';

defineOptions({
  name: 'SystemDictData'
});

const route = useRoute();
const appStore = useAppStore();
const { hasAuth } = useAuth();

const dictType = computed(() => route.query.dictType as string);

const fieldPolicy = shallowRef<Api.SystemManage.OrdinaryCapabilities>();

const searchParams: Api.SystemManage.DictDataSearchParams = reactive({
  current: 1,
  size: 10,
  status: null,
  dictType: dictType.value,
  dictLabel: null,
  dictValue: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetDictDataList(searchParams),
    transform: response => {
      fieldPolicy.value = response.error ? undefined : response.data.fieldPolicy;
      return defaultTransform(response);
    },
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
        key: 'dictLabel',
        title: $t('page.system.dict.dictLabel'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'dictValue',
        title: $t('page.system.dict.dictValue'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'dictSort',
        title: $t('page.system.dict.dictSort'),
        align: 'center',
        width: 100
      },
      {
        key: 'isDefault',
        title: $t('page.system.dict.isDefault'),
        align: 'center',
        width: 100,
        render: row => {
          if (row.isDefault === null || row.isDefault === undefined) {
            return null;
          }

          const tagMap: Record<'Y' | 'N', NaiveUI.ThemeColor> = {
            Y: 'success',
            N: 'default'
          };

          const label = row.isDefault === 'Y' ? $t('common.yesOrNo.yes') : $t('common.yesOrNo.no');

          return <NTag type={tagMap[row.isDefault]}>{label}</NTag>;
        }
      },
      {
        key: 'status',
        title: $t('page.system.dict.status'),
        align: 'center',
        width: 100,
        render: row => {
          if (!row.status) {
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
        width: 160,
        render: row => (
          <div class="flex-center gap-8px">
            {hasAuth('system:dict-data:edit') && Boolean(row.fieldPolicy?.update?.length) && (
              <NButton type="primary" ghost size="small" onClick={() => edit(row.dictCode)}>
                {$t('common.edit')}
              </NButton>
            )}
            {hasAuth('system:dict-data:delete') && (
              <NPopconfirm onPositiveClick={() => handleDelete(row.dictCode)}>
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

const visibleColumns = computed(() => columns.value.filter(column => !('key' in column) ||
  ['index', 'operate'].includes(String(column.key)) || fieldAllowed(fieldPolicy.value?.read, String(column.key))));

const {
  drawerVisible,
  operateType,
  editingData,
  handleAdd,
  handleEdit,
  checkedRowKeys,
  onBatchDeleted,
  onDeleted
} = useTableOperate(data, 'dictCode', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteDictData(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteDictData(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}

onMounted(() => {
  searchParams.dictType = dictType.value;
  getData();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <DictDataSearch v-model:model="searchParams" :allowed-fields="fieldPolicy?.query" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.dict.dictDataTitle')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :show-add="fieldPolicy?.canCreate === true"
          :disabled-delete="checkedRowKeys.length === 0"
          :loading="loading"
          add-auth="system:dict-data:add"
          delete-auth="system:dict-data:batch-delete"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="visibleColumns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="row => row.dictCode"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <DictDataOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :capabilities="fieldPolicy"
        :dict-type="dictType"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
