<script setup lang="tsx">
import { reactive } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchBatchDeleteLoginLog, fetchCleanLoginLog, fetchGetLoginLogList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import LoginLogSearch from './modules/login-log-search.vue';

defineOptions({
  name: 'SystemLoginLog'
});

const appStore = useAppStore();

const searchParams: Api.SystemManage.LoginLogSearchParams = reactive({
  current: 1,
  size: 10,
  username: null,
  status: null,
  ip: null,
  startTime: null,
  endTime: null
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } =
  useNaivePaginatedTable({
    api: () => fetchGetLoginLogList(searchParams),
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
        title: $t('page.system.loginLog.username'),
        align: 'center',
        minWidth: 100
      },
      {
        key: 'ip',
        title: 'IP',
        align: 'center',
        width: 130
      },
      {
        key: 'userAgent',
        title: $t('page.system.loginLog.userAgent'),
        minWidth: 200,
        ellipsis: { tooltip: true },
        render: row => row.userAgent || '-'
      },
      {
        key: 'status',
        title: $t('page.system.loginLog.status'),
        align: 'center',
        width: 80,
        render: row => {
          const statusMap: Record<string, { type: NaiveUI.ThemeColor; label: string }> = {
            '1': { type: 'success', label: $t('page.system.loginLog.statusSuccess') },
            '2': { type: 'error', label: $t('page.system.loginLog.statusFailed') },
            '3': { type: 'warning', label: $t('page.system.loginLog.statusLocked') }
          };
          const item = statusMap[row.status];
          if (!item) return row.status;
          return <NTag type={item.type}>{item.label}</NTag>;
        }
      },
      {
        key: 'message',
        title: $t('page.system.loginLog.message'),
        minWidth: 120,
        render: row => row.message || '-'
      },
      {
        key: 'loginTime',
        title: $t('page.system.loginLog.loginTime'),
        align: 'center',
        minWidth: 160
      }
    ]
  });

const { checkedRowKeys, onDeleted } = useTableOperate(data, 'loginLogId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteLoginLog(checkedRowKeys.value);
  if (!error) {
    onDeleted();
  }
}

async function handleClean() {
  const { error } = await fetchCleanLoginLog(90);
  if (!error) {
    window.$message?.success($t('page.system.loginLog.cleanSuccess'));
    getDataByPage();
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <LoginLogSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.loginLog.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <NSpace>
          <NPopconfirm @positive-click="handleClean">
            <template #trigger>
              <NButton type="warning" size="small">
                {{ $t('page.system.loginLog.clean') }}
              </NButton>
            </template>
            {{ $t('page.system.loginLog.cleanConfirm') }}
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
        :scroll-x="1100"
        :loading="loading"
        remote
        :row-key="row => row.loginLogId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
