<script setup lang="tsx">
import { reactive } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { fetchBatchDeleteConfig, fetchDeleteConfig, fetchExportConfig, fetchGetConfigList, fetchImportConfig } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import ConfigOperateDrawer from './modules/config-operate-drawer.vue';
import ConfigSearch from './modules/config-search.vue';

const appStore = useAppStore();
const { hasAuth } = useAuth();

const searchParams: Api.SystemManage.ConfigSearchParams = reactive({
  current: 1,
  size: 10,
  configName: null,
  configKey: null,
  configGroup: null,
  status: null
});

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetConfigList(searchParams),
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
      key: 'configName',
      title: $t('page.system.config.configName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'configKey',
      title: $t('page.system.config.configKey'),
      align: 'center',
      minWidth: 150
    },
    {
      key: 'configValue',
      title: $t('page.system.config.configValue'),
      minWidth: 200,
      ellipsis: { tooltip: true }
    },
    {
      key: 'configType',
      title: $t('page.system.config.configType'),
      align: 'center',
      width: 100,
      render: row => {
        const typeMap: Record<string, string> = {
          text: $t('page.system.config.typeText'),
          richtext: $t('page.system.config.typeRichtext'),
          file: $t('page.system.config.typeFile')
        };
        return typeMap[row.configType] || row.configType;
      }
    },
    {
      key: 'configGroup',
      title: $t('page.system.config.configGroup'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'status',
      title: $t('page.system.config.configStatus'),
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
      title: $t('page.system.config.remark'),
      minWidth: 120,
      ellipsis: { tooltip: true }
    },
    {
      key: 'isPublic',
      title: $t('page.system.config.isPublic'),
      align: 'center',
      width: 90,
      render: row => <NTag type={row.isPublic ? 'success' : 'default'} size="small">{row.isPublic ? '✓' : '—'}</NTag>
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 160,
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => edit(row.configId)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDelete(row.configId)}>
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
} = useTableOperate(data, 'configId', getData);

async function handleBatchDelete() {
  const { error } = await fetchBatchDeleteConfig(checkedRowKeys.value);
  if (!error) {
    onBatchDeleted();
  }
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteConfig(id);
  if (!error) {
    onDeleted();
  }
}

function edit(id: string) {
  handleEdit(id);
}

async function handleExport() {
  const { error, response } = await fetchExportConfig(searchParams);
  if (!error && response) {
    const blob = new Blob([response as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config_export.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

function handleImport({ file }: { file: { file: File | null } }) {
  if (!file.file) return false;
  fetchImportConfig(file.file).then((res: any) => {
    if (!res.error) {
      window.$message?.success(res.data?.msg || '导入成功');
      getDataByPage();
    }
  });
  return false;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ConfigSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard :title="$t('page.system.config.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton v-if="hasAuth('system:config:export')" size="small" ghost type="success" @click="handleExport">
            <template #icon>
              <IconUilExport class="text-icon" />
            </template>
            {{ $t('common.export') }}
          </NButton>
          <NUpload
            v-if="hasAuth('system:config:import')"
            :show-file-list="false"
            accept=".xlsx,.xls"
            :custom-request="handleImport"
          >
            <NButton size="small" ghost type="warning">
              <template #icon>
                <IconUilImport class="text-icon" />
              </template>
              {{ $t('common.import') }}
            </NButton>
          </NUpload>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :disabled-delete="checkedRowKeys.length === 0"
            :loading="loading"
            @add="handleAdd"
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
        :scroll-x="962"
        :loading="loading"
        remote
        :row-key="row => row.configId"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
      <ConfigOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
