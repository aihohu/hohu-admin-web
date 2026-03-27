<script setup lang="tsx">
import { reactive, onMounted, computed } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import {
  fetchBatchDeleteDictData,
  fetchDeleteDictData,
  fetchGetDictDataList
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { useRoute } from 'vue-router';
import DictDataOperateDrawer from '../modules/dict-data-operate-drawer.vue';
import DictDataSearch from '../modules/dict-data-search.vue';

defineOptions({
  name: 'SystemDictData'
});

const route = useRoute();
const appStore = useAppStore();

const dictType = computed(() => route.params.dictType as string);

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
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 160,
        render: row => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => edit(row.dictDataId)}>
              {$t('common.edit')}
            </NButton>
            <NPopconfirm onPositiveClick={() => handleDelete(row.dictDataId)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small">
                    {$t('common.delete')}
                  </NButton>
                )
              }}
            </NPopconfirm>
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
} = useTableOperate(data, 'dictDataId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteDictData(checkedRowKeys.value.map(Number));
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: number) {
  const { error } = await fetchDeleteDictData(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: number) {
  handleEdit(id);
}

onMounted(() => {
  searchParams.dictType = dictType.value;
  getData();
});
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <DictDataSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.dict.dictDataTitle')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
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
        :row-key="row => row.dictDataId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <DictDataOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        :dict-type="dictType"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
