<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchBatchDeleteOperationLog, fetchCleanOperationLog, fetchGetOperationLogList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import OperationLogDetailModal from './modules/operation-log-detail-modal.vue';
import OperationLogSearch from './modules/operation-log-search.vue';

defineOptions({
  name: 'SystemOperationLog'
});

const appStore = useAppStore();

const searchParams: Api.SystemManage.OperationLogSearchParams = reactive({
  current: 1,
  size: 10,
  module: null,
  action: null,
  username: null,
  statusCode: null,
  startTime: null,
  endTime: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetOperationLogList(searchParams),
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
        key: 'username',
        title: $t('page.system.operationLog.username'),
        align: 'center',
        minWidth: 100
      },
      {
        key: 'module',
        title: $t('page.system.operationLog.module'),
        align: 'center',
        width: 100
      },
      {
        key: 'action',
        title: $t('page.system.operationLog.action'),
        align: 'center',
        width: 80,
        render: row => {
          const actionMap: Record<string, { type: NaiveUI.ThemeColor; label: string }> = {
            create: { type: 'success', label: $t('page.system.operationLog.actionCreate') },
            update: { type: 'warning', label: $t('page.system.operationLog.actionUpdate') },
            delete: { type: 'error', label: $t('page.system.operationLog.actionDelete') }
          };
          const item = actionMap[row.action];
          if (!item) return row.action;
          return <NTag type={item.type}>{item.label}</NTag>;
        }
      },
      {
        key: 'method',
        title: $t('page.system.operationLog.method'),
        align: 'center',
        width: 80
      },
      {
        key: 'path',
        title: $t('page.system.operationLog.path'),
        minWidth: 180,
        ellipsis: { tooltip: true }
      },
      {
        key: 'statusCode',
        title: $t('page.system.operationLog.statusCode'),
        align: 'center',
        width: 80,
        render: row => {
          const code = row.statusCode;
          if (!code) return '-';
          const type = code < 400 ? 'success' : code < 500 ? 'warning' : 'error';
          return <NTag type={type}>{String(code)}</NTag>;
        }
      },
      {
        key: 'duration',
        title: $t('page.system.operationLog.duration'),
        align: 'center',
        width: 80,
        render: row => (row.duration != null ? `${row.duration}ms` : '-')
      },
      {
        key: 'ip',
        title: 'IP',
        align: 'center',
        width: 130
      },
      {
        key: 'createTime',
        title: $t('page.system.operationLog.createTime'),
        align: 'center',
        minWidth: 160
      },
      {
        key: 'actions',
        title: $t('common.action'),
        align: 'center',
        width: 80,
        render: row => (
          <NButton text type="primary" size="small" onClick={() => handleView(row)}>
            {$t('common.view')}
          </NButton>
        )
      }
    ]
  });

const { checkedRowKeys, onDeleted } = useTableOperate(data, 'operationLogId', getData);

const detailVisible = ref(false);
const detailRow = ref<Api.SystemManage.OperationLog | null>(null);

function handleView(row: Api.SystemManage.OperationLog) {
  detailRow.value = row;
  detailVisible.value = true;
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteOperationLog(checkedRowKeys.value);
  if (!error) {
    onDeleted();
  }
}

async function handleClean() {
  const { error } = await fetchCleanOperationLog(90);
  if (!error) {
    window.$message?.success($t('page.system.operationLog.cleanSuccess'));
    getDataByPage();
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OperationLogSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.operationLog.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <NSpace>
          <NPopconfirm v-permission="'monitor:operation-log:clean'" @positive-click="handleClean">
            <template #trigger>
              <NButton type="warning" size="small">
                {{ $t('page.system.operationLog.clean') }}
              </NButton>
            </template>
            {{ $t('page.system.operationLog.cleanConfirm') }}
          </NPopconfirm>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            :show-add="false"
            delete-auth="monitor:operation-log:delete"
            @delete="handleBatchDelete"
            @refresh="getData"
          />
        </NSpace>
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1400"
        :loading="loading"
        remote
        :row-key="row => row.operationLogId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
    <OperationLogDetailModal v-model:visible="detailVisible" :row-data="detailRow" />
  </div>
</template>

<style scoped></style>
