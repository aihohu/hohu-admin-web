<script setup lang="tsx">
import { reactive, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchBatchDeleteJobLog, fetchCleanJobLog, fetchGetJobLogList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import JobLogDetailDrawer from './modules/job-log-detail-drawer.vue';
import JobLogSearch from './modules/job-log-search.vue';

defineOptions({
  name: 'SystemJobLog'
});

const appStore = useAppStore();

const searchParams: Api.SystemManage.JobLogSearchParams = reactive({
  current: 1,
  size: 10,
  jobId: null,
  jobKey: null,
  status: null,
  startTime: null,
  endTime: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetJobLogList(searchParams),
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
        key: 'jobName',
        title: $t('page.system.jobLog.jobName'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'jobKey',
        title: $t('page.system.jobLog.jobKey'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'status',
        title: $t('page.system.jobLog.status'),
        align: 'center',
        width: 100,
        render: row => {
          const statusMap: Record<string, { type: NaiveUI.ThemeColor; label: string }> = {
            '1': { type: 'success', label: $t('page.system.jobLog.statusSuccess') },
            '2': { type: 'error', label: $t('page.system.jobLog.statusFailed') },
            '3': { type: 'primary', label: $t('page.system.jobLog.statusRunning') }
          };
          const item = statusMap[row.status];
          if (!item) return null;
          return <NTag type={item.type}>{item.label}</NTag>;
        }
      },
      {
        key: 'duration',
        title: $t('page.system.jobLog.duration'),
        align: 'center',
        width: 100,
        render: row => (row.duration != null ? `${row.duration}` : '-')
      },
      {
        key: 'startTime',
        title: $t('page.system.jobLog.startTime'),
        align: 'center',
        minWidth: 160
      },
      {
        key: 'endTime',
        title: $t('page.system.jobLog.endTime'),
        align: 'center',
        minWidth: 160,
        render: row => row.endTime || '-'
      },
      {
        key: 'errorMsg',
        title: $t('page.system.jobLog.errorMsg'),
        minWidth: 200,
        ellipsis: { tooltip: true },
        render: row => row.errorMsg || '-'
      },
      {
        key: 'actions',
        title: $t('common.action'),
        align: 'center',
        width: 80,
        fixed: 'right',
        render: row => (
          <NButton size="small" type="primary" text onClick={() => handleViewDetail(row)}>
            {$t('common.view')}
          </NButton>
        )
      }
    ]
  });

const { checkedRowKeys, onDeleted } = useTableOperate(data, 'jobLogId', getData);

/** 详情抽屉 */
const detailVisible = ref(false);
const detailRow = ref<Api.SystemManage.JobLog | null>(null);

function handleViewDetail(row: Api.SystemManage.JobLog) {
  detailRow.value = row;
  detailVisible.value = true;
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteJobLog(checkedRowKeys.value);
  if (!error) {
    onDeleted();
  }
}

async function handleClean() {
  const { error } = await fetchCleanJobLog(30);
  if (!error) {
    window.$message?.success($t('page.system.jobLog.cleanSuccess'));
    getDataByPage();
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <JobLogSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.jobLog.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NPopconfirm @positive-click="handleClean">
            <template #trigger>
              <NButton type="warning" size="small">
                {{ $t('page.system.jobLog.clean') }}
              </NButton>
            </template>
            {{ $t('page.system.jobLog.cleanConfirm') }}
          </NPopconfirm>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            :show-add="false"
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
        :scroll-x="1280"
        :loading="loading"
        remote
        :row-key="row => row.jobLogId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
    <JobLogDetailDrawer v-model:visible="detailVisible" :row-data="detailRow" />
  </div>
</template>

<style scoped></style>
