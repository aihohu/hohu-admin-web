<script setup lang="tsx">
import { reactive } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { fetchBatchDeleteJob, fetchDeleteJob, fetchGetJobList, fetchRunJobNow, fetchUpdateJobStatus } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import JobOperateDrawer from './modules/job-operate-drawer.vue';
import JobSearch from './modules/job-search.vue';

defineOptions({
  name: 'SystemJob'
});

const appStore = useAppStore();

const searchParams: Api.SystemManage.JobSearchParams = reactive({
  current: 1,
  size: 10,
  status: null,
  jobName: null,
  jobKey: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetJobList(searchParams),
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
        title: $t('page.system.job.jobName'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'jobKey',
        title: $t('page.system.job.jobKey'),
        align: 'center',
        minWidth: 120
      },
      {
        key: 'cronExpression',
        title: $t('page.system.job.cronExpression'),
        align: 'center',
        minWidth: 120,
        render: row => {
          if (row.triggerType === 'interval') {
            const unitMap: Record<string, string> = {
              seconds: $t('page.system.job.unitSeconds'),
              minutes: $t('page.system.job.unitMinutes'),
              hours: $t('page.system.job.unitHours'),
              days: $t('page.system.job.unitDays')
            };
            return `${row.intervalValue} ${unitMap[row.intervalUnit || 'seconds']}`;
          }
          return row.cronExpression || '-';
        }
      },
      {
        key: 'status',
        title: $t('page.system.job.status'),
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
        key: 'concurrent',
        title: $t('page.system.job.concurrent'),
        align: 'center',
        width: 100,
        render: row => {
          return row.concurrent === '1'
            ? $t('page.system.job.concurrentAllow')
            : $t('page.system.job.concurrentForbid');
        }
      },
      {
        key: 'nextRunTime',
        title: $t('page.system.job.nextRunTime'),
        align: 'center',
        minWidth: 160,
        render: row => row.nextRunTime || '-'
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 320,
        render: row => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => edit(row.jobId)}>
              {$t('common.edit')}
            </NButton>
            {row.status === '1' ? (
              <NPopconfirm onPositiveClick={() => handleToggleStatus(row.jobId, '2')}>
                {{
                  default: () => $t('page.system.job.disableConfirm'),
                  trigger: () => (
                    <NButton type="warning" ghost size="small">
                      {$t('page.system.job.disableJob')}
                    </NButton>
                  )
                }}
              </NPopconfirm>
            ) : (
              <NPopconfirm onPositiveClick={() => handleToggleStatus(row.jobId, '1')}>
                {{
                  default: () => $t('page.system.job.enableConfirm'),
                  trigger: () => (
                    <NButton type="success" ghost size="small">
                      {$t('page.system.job.enableJob')}
                    </NButton>
                  )
                }}
              </NPopconfirm>
            )}
            <NPopconfirm onPositiveClick={() => handleRunNow(row.jobId)}>
              {{
                default: () => $t('page.system.job.runConfirm'),
                trigger: () => (
                  <NButton type="info" ghost size="small">
                    {$t('page.system.job.runNow')}
                  </NButton>
                )
              }}
            </NPopconfirm>
            <NPopconfirm onPositiveClick={() => handleDelete(row.jobId)}>
              {{
                default: () => $t('common.confirmDelete'),
                trigger: () => (
                  <NButton type="error" ghost size="small" disabled={row.status === '1'}>
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
  onDeleted
} = useTableOperate(data, 'jobId', getData);

async function handleDelete(id: string) {
  const { error } = await fetchDeleteJob(id);
  if (!error) {
    onDeleted();
  }
}

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteJob(checkedRowKeys.value);
  if (!error) {
    onDeleted();
  }
}

async function handleToggleStatus(jobId: string, status: string) {
  const { error } = await fetchUpdateJobStatus(jobId, status);
  if (!error) {
    window.$message?.success($t('common.updateSuccess'));
    getData();
  }
}

async function handleRunNow(jobId: string) {
  const { error } = await fetchRunJobNow(jobId);
  if (!error) {
    window.$message?.success($t('page.system.job.runNow'));
  }
}

function edit(id: string) {
  handleEdit(id);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <JobSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.job.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        :scroll-x="1260"
        :loading="loading"
        remote
        :row-key="row => row.jobId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <JobOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
