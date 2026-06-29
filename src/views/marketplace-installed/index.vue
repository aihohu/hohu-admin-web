<script setup lang="tsx">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { $t } from '@/locales';
import { fetchInstalledApps, enableApp, disableApp, uninstallApp, type Marketplace } from '@/service/api/marketplace';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import InstalledSearch from './modules/installed-search.vue';

const router = useRouter();

const searchParams = reactive({
  current: 1,
  size: 10,
  appSlug: null as string | null,
  status: null as string | null
});

const statusConfig: Record<
  string,
  { key: App.I18n.I18nKey; type: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  enabled: { key: 'page.marketplace.status.enabled', type: 'success' },
  installed: { key: 'page.marketplace.status.installed', type: 'info' },
  disabled: { key: 'page.marketplace.status.disabled', type: 'warning' },
  uninstalled: { key: 'page.marketplace.status.uninstalled', type: 'error' }
};

const { columns, columnChecks, data, loading, getData, getDataByPage, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchInstalledApps(searchParams),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.current = params.page ?? 1;
    searchParams.size = params.pageSize ?? 10;
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      width: 64,
      align: 'center',
      render: (_, index) => index + 1
    },
    {
      key: 'appName',
      title: $t('page.marketplace.installed.colApp'),
      minWidth: 200,
      render: row => (
        <div>
          <div class="font-bold">{row.appName}</div>
          <div class="text-xs text-gray-400">{row.appSlug}</div>
        </div>
      )
    },
    { key: 'installedVersion', title: $t('page.marketplace.installed.colVersion'), align: 'center', width: 100 },
    {
      key: 'status',
      title: $t('page.marketplace.installed.colStatus'),
      align: 'center',
      width: 100,
      render: row => {
        const s = statusConfig[row.status] || { key: ('route.' + row.status) as App.I18n.I18nKey, type: 'default' as const };
        return <NTag type={s.type} size="small">{$t(s.key)}</NTag>;
      }
    },
    { key: 'installedAt', title: $t('page.marketplace.installed.colInstalledAt'), width: 170 },
    {
      key: 'operate',
      title: $t('page.marketplace.installed.colActions'),
      align: 'center',
      width: 280,
      fixed: 'right',
      render: row => {
        const buttons: any[] = [];
        if (row.status === 'enabled') {
          buttons.push(
            <NButton size="small" type="success" ghost onClick={() => onOpen(row)}>
              {$t('page.marketplace.actions.open')}
            </NButton>
          );
          buttons.push(
            <NButton size="small" ghost onClick={() => onDisable(row)}>
              {$t('page.marketplace.actions.disable')}
            </NButton>
          );
        } else if (row.status === 'disabled' || row.status === 'installed') {
          buttons.push(
            <NButton size="small" type="primary" ghost onClick={() => onEnable(row)}>
              {$t('page.marketplace.actions.enable')}
            </NButton>
          );
        }
        buttons.push(
          <NPopconfirm onPositiveClick={() => onUninstall(row)}>
            {{
              default: () => $t('page.marketplace.detail.confirmUninstall'),
              trigger: () => (
                <NButton size="small" type="error" ghost>
                  {$t('page.marketplace.actions.uninstall')}
                </NButton>
              )
            }}
          </NPopconfirm>
        );
        return <div class="flex-center gap-8px">{buttons}</div>;
      }
    }
  ]
});

async function onOpen(row: Marketplace.Install) {
  // In-place navigation: lowcode apps are trusted (declared manifest, no remote code)
  // so they render inside BaseLayout like any other module. New-tab isolation is
  // reserved for Phase 2 remote-component apps.
  router.push(`/app/${row.appSlug}/list`);
}

async function onEnable(row: Marketplace.Install) {
  const { error } = await enableApp(row.appSlug);
  if (!error) {
    window.$message?.success($t('page.marketplace.messages.enabled'));
    getData();
  }
}

async function onDisable(row: Marketplace.Install) {
  const { error } = await disableApp(row.appSlug);
  if (!error) {
    window.$message?.success($t('page.marketplace.messages.disabled'));
    getData();
  }
}

async function onUninstall(row: Marketplace.Install) {
  const { error } = await uninstallApp(row.appSlug);
  if (!error) {
    window.$message?.success($t('page.marketplace.messages.uninstalled'));
    getData();
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <InstalledSearch v-model:model="searchParams" @search="getDataByPage" />
    <NCard
      :title="$t('page.marketplace.installed.title')"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1-hidden"
      data-testid="installed-apps-card"
    >
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :hide-add="true"
          :hide-delete="true"
          :loading="loading"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="true"
        :scroll-x="1100"
        :loading="loading"
        remote
        :row-key="(row: Marketplace.Install) => row.id"
        :pagination="mobilePagination"
        data-testid="installed-apps-table"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
