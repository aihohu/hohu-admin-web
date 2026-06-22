<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  fetchAppDetail,
  installApp,
  uninstallApp,
  enableApp,
  disableApp,
  fetchInstalledApps,
  type Marketplace
} from '@/service/api/marketplace';

defineOptions({ name: 'MarketplaceDetail', meta: { title: '应用详情', i18nKey: 'route.marketplace_detail' } });

const route = useRoute();
const router = useRouter();
const slug = (route.query.id as string) || '';

const loading = ref(true);
const app = ref<Marketplace.AppDetail | null>(null);
const installStatus = ref<string | null>(null);
const actionLoading = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const { data: detail, error } = await fetchAppDetail(slug);
    if (!error) {
      app.value = detail;
    }
    const { data: installed } = await fetchInstalledApps({ size: 100 });
    if (installed && app.value) {
      const record = installed.records.find(r => r.appId === app.value?.id);
      if (record) {
        installStatus.value = record.status;
      }
    }
  } finally {
    loading.value = false;
  }
}

async function onInstall() {
  actionLoading.value = true;
  try {
    const { error } = await installApp({ appSlug: slug });
    if (!error) {
      window.$message?.success('安装成功');
      installStatus.value = 'installed';
      await enableApp(slug);
      installStatus.value = 'enabled';
    }
  } catch (e: any) {
    window.$message?.error(e?.message || '安装失败');
  } finally {
    actionLoading.value = false;
  }
}

async function onUninstall() {
  actionLoading.value = true;
  try {
    const { error } = await uninstallApp(slug);
    if (!error) {
      window.$message?.success('已卸载');
      installStatus.value = null;
    }
  } finally {
    actionLoading.value = false;
  }
}

async function onEnable() {
  actionLoading.value = true;
  try {
    const { error } = await enableApp(slug);
    if (!error) {
      window.$message?.success('已启用');
      installStatus.value = 'enabled';
    }
  } finally {
    actionLoading.value = false;
  }
}

async function onDisable() {
  actionLoading.value = true;
  try {
    const { error } = await disableApp(slug);
    if (!error) {
      window.$message?.success('已禁用');
      installStatus.value = 'disabled';
    }
  } finally {
    actionLoading.value = false;
  }
}

function openApp() {
  router.push(`/app/${slug}/list`);
}

function goBack() {
  router.push('/marketplace');
}

onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <NSpin :show="loading">
      <NCard v-if="app">
        <template #header>
          <NSpace align="center" size="large">
            <NAvatar v-if="app.icon" :src="app.icon" :size="60" round />
            <NAvatar v-else :size="60" round>{{ app.name.charAt(0) }}</NAvatar>
            <div>
              <h2 class="text-xl font-bold">{{ app.name }}</h2>
              <p class="text-gray-400">作者：{{ app.authorName || '未知' }}</p>
            </div>
          </NSpace>
        </template>

        <NSpace vertical size="large">
          <!-- Description -->
          <div>
            <h3 class="font-bold mb-2">描述</h3>
            <p>{{ app.description || '暂无描述' }}</p>
          </div>

          <!-- Stats -->
          <NSpace size="large">
            <NStatistic label="下载量" :value="app.downloadCount" />
            <NStatistic label="评分" :value="app.avgRating.toFixed(1)" />
            <NStatistic label="评分数" :value="app.ratingCount" />
          </NSpace>

          <!-- Tags -->
          <NSpace>
            <NTag type="info">{{ app.category }}</NTag>
            <NTag v-for="tag in app.tags" :key="tag" size="small">{{ tag }}</NTag>
          </NSpace>
        </NSpace>

        <template #action>
          <NSpace>
            <NButton quaternary @click="goBack">返回</NButton>

            <!-- Not installed -->
            <NButton
              v-if="!installStatus || installStatus === 'uninstalled'"
              type="primary"
              :loading="actionLoading"
              @click="onInstall"
            >
              安装
            </NButton>

            <!-- Installed + enabled -->
            <template v-if="installStatus === 'enabled'">
              <NButton type="success" @click="openApp">打开应用</NButton>
              <NButton :loading="actionLoading" @click="onDisable">禁用</NButton>
              <NPopconfirm @positive-click="onUninstall">
                <template #trigger>
                  <NButton type="error" :loading="actionLoading">卸载</NButton>
                </template>
                确认卸载？数据表将被删除。
              </NPopconfirm>
            </template>

            <!-- Installed + disabled -->
            <template v-if="installStatus === 'disabled'">
              <NButton type="primary" :loading="actionLoading" @click="onEnable">启用</NButton>
              <NPopconfirm @positive-click="onUninstall">
                <template #trigger>
                  <NButton type="error" :loading="actionLoading">卸载</NButton>
                </template>
                确认卸载？数据表将被删除。
              </NPopconfirm>
            </template>

            <!-- Installed (just installed, not enabled) -->
            <template v-if="installStatus === 'installed'">
              <NButton type="primary" :loading="actionLoading" @click="onEnable">启用</NButton>
            </template>
          </NSpace>
        </template>
      </NCard>
      <NEmpty v-else description="应用不存在或加载失败" class="py-20" />
    </NSpin>
  </div>
</template>
