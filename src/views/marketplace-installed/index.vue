<script setup lang="tsx">
import { ref, h, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NDataTable, NTag, NSpace, NPopconfirm } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  fetchInstalledApps,
  fetchMarketplaceApps,
  enableApp,
  disableApp,
  uninstallApp,
  type Marketplace
} from '@/service/api/marketplace';

defineOptions({ name: 'MarketplaceInstalled', meta: { title: '已安装应用', i18nKey: 'route.marketplace_installed' } });

const router = useRouter();
const loading = ref(false);
const records = ref<Marketplace.Install[]>([]);
const actionLoading = ref(false);
// Map appId -> app slug (for actions that need slug). Built from published apps list.
const slugByAppId = ref<Record<string, string>>({});

const statusLabels: Record<string, { label: string; type: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  enabled: { label: '已启用', type: 'success' },
  installed: { label: '已安装', type: 'info' },
  disabled: { label: '已禁用', type: 'warning' },
  uninstalled: { label: '已卸载', type: 'error' }
};

const columns: DataTableColumns<Marketplace.Install> = [
  {
    title: '应用',
    key: 'appId',
    minWidth: 200,
    render: row => {
      const slug = slugByAppId.value[row.appId];
      return slug || row.appId;
    }
  },
  { title: '版本', key: 'installedVersion', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: row => {
      const s = statusLabels[row.status] || { label: row.status, type: 'default' as const };
      return h(NTag, { type: s.type, size: 'small' }, () => s.label);
    }
  },
  { title: '安装时间', key: 'installedAt', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    render: row => {
      const buttons: ReturnType<typeof h>[] = [];
      const slug = slugByAppId.value[row.appId];
      if (!slug) {
        buttons.push(h(NButton, { size: 'small', quaternary: true, onClick: () => goToDetail(row) }, () => '详情'));
        return h(NSpace, { size: 'small' }, () => buttons);
      }
      if (row.status === 'enabled') {
        buttons.push(h(NButton, { size: 'small', type: 'success', onClick: () => openApp(slug) }, () => '打开'));
        buttons.push(h(NButton, { size: 'small', onClick: () => onDisable(slug) }, () => '禁用'));
      } else if (row.status === 'disabled' || row.status === 'installed') {
        buttons.push(h(NButton, { size: 'small', type: 'primary', onClick: () => onEnable(slug) }, () => '启用'));
      }
      buttons.push(
        h(
          NPopconfirm,
          { onPositiveClick: () => onUninstall(slug) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error' }, () => '卸载'),
            default: () => '确认卸载？数据表将被删除。'
          }
        )
      );
      return h(NSpace, { size: 'small' }, () => buttons);
    }
  }
];

async function loadData() {
  loading.value = true;
  try {
    const { data, error } = await fetchInstalledApps({ size: 100 });
    if (!error) {
      records.value = data.records;
    }
    // Load app list to map appId -> slug
    const { data: appsData } = await fetchMarketplaceApps({ size: 200 });
    if (appsData) {
      const map: Record<string, string> = {};
      appsData.records.forEach(a => {
        map[a.id] = a.slug;
      });
      slugByAppId.value = map;
    }
  } finally {
    loading.value = false;
  }
}

function openApp(slug: string) {
  router.push(`/app/${slug}/list`);
}

function goToDetail(_row: Marketplace.Install) {
  window.$message?.info('请从应用市场详情页操作');
}

async function onEnable(slug: string) {
  actionLoading.value = true;
  try {
    const { error } = await enableApp(slug);
    if (!error) {
      window.$message?.success('已启用');
      await loadData();
    }
  } finally {
    actionLoading.value = false;
  }
}

async function onDisable(slug: string) {
  actionLoading.value = true;
  try {
    const { error } = await disableApp(slug);
    if (!error) {
      window.$message?.success('已禁用');
      await loadData();
    }
  } finally {
    actionLoading.value = false;
  }
}

async function onUninstall(slug: string) {
  actionLoading.value = true;
  try {
    const { error } = await uninstallApp(slug);
    if (!error) {
      window.$message?.success('已卸载');
      await loadData();
    }
  } finally {
    actionLoading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <NCard title="已安装应用">
      <NDataTable :columns="columns" :data="records" :loading="loading" :bordered="false" />
    </NCard>
  </div>
</template>
