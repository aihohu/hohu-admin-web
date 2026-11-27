<script setup lang="tsx">
import { reactive } from 'vue';
import { computed, shallowRef } from 'vue';
import { deliveryColumns } from '@/hooks/business/delivery-fields';
import { controlQuery } from '@/hooks/business/control-fields';
import { fieldAllowed } from '@/hooks/business/ordinary-fields';
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
const fieldPolicy = shallowRef<Api.Common.DeliveryCapabilities>();

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
    api: () => fetchGetLoginLogList(controlQuery(searchParams, fieldPolicy.value?.query)),
    transform: response => {
      fieldPolicy.value = response.error ? undefined : response.data.fieldPolicy;
      for (const key of Object.keys(searchParams)) {
        const source = ['startTime', 'endTime'].includes(key) ? 'loginTime' : key;
        if (!['current', 'size'].includes(key) && !fieldAllowed(fieldPolicy.value?.query, source)) Object.assign(searchParams, { [key]: null });
      }
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
          const item = row.status === undefined ? undefined : statusMap[row.status];
          if (!item) return row.status;
          return <NTag type={item.type}>{item.label}</NTag>;
        }
      },
      {
        key: 'loginTime',
        title: $t('page.system.loginLog.loginTime'),
        align: 'center',
        minWidth: 160
      }
    ]
  });

const visibleColumns = computed(() => deliveryColumns(columns.value, data.value, fieldPolicy.value));

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
    <LoginLogSearch v-model:model="searchParams" :query-fields="fieldPolicy?.query" @search="getDataByPage" />
    <NCard
      :title="$t('page.system.loginLog.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
    >
      <template #header-extra>
        <NSpace>
          <NPopconfirm v-permission="'monitor:login-log:clean'" @positive-click="handleClean">
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
            delete-auth="monitor:login-log:delete"
            @delete="handleBatchDelete"
            @refresh="getData"
          />
        </NSpace>
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="visibleColumns"
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
