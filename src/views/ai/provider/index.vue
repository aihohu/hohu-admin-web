<script setup lang="tsx">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { fetchDeleteProvider, fetchGetProviderList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import ProviderOperateDrawer from './modules/provider-operate-drawer.vue';

const { t } = useI18n();
const appStore = useAppStore();

const searchParams: Api.Ai.ProviderSearchParams = reactive({
  current: 1,
  size: 10,
  name: null,
  providerCode: null
});

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetProviderList(searchParams),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.current = params.page;
    searchParams.size = params.pageSize;
  },
  columns: () => [
    {
      key: 'index',
      title: t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'name',
      title: t('page.ai.provider.name'),
      minWidth: 120
    },
    {
      key: 'providerCode',
      title: t('page.ai.provider.code'),
      minWidth: 100
    },
    {
      key: 'apiKey',
      title: t('page.ai.provider.apiKey'),
      minWidth: 160,
      render: row => {
        const key = row.apiKey || '';
        if (key.length <= 8) return key;
        return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
      }
    },
    {
      key: 'baseUrl',
      title: t('page.ai.provider.baseUrl'),
      minWidth: 160,
      render: row => row.baseUrl || '-'
    },
    {
      key: 'isEnabled',
      title: t('page.ai.provider.status'),
      align: 'center',
      width: 80,
      render: row => {
        const enabled = row.isEnabled;
        return <NTag type={enabled ? 'success' : 'warning'}>{enabled ? t('page.system.common.status.enable') : t('page.system.common.status.disable')}</NTag>;
      }
    },
    {
      key: 'operate',
      title: t('common.operate'),
      align: 'center',
      width: 180,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => edit(row.providerId)}>
            {t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.providerId)}>
            {{
              default: () => t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small">
                  {t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, onDeleted } = useTableOperate(
  data,
  'providerId',
  getData
);

async function handleDelete(id: string) {
  const { error } = await fetchDeleteProvider(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="t('page.ai.provider.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation v-model:columns="columnChecks" :loading="loading" @add="handleAdd" @refresh="getData" />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="840"
        :loading="loading"
        remote
        :row-key="row => row.providerId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <ProviderOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>
