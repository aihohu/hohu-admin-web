<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { $t } from '@/locales';
import {
  fetchAppDetail,
  installApp,
  uninstallApp,
  enableApp,
  disableApp,
  fetchInstalledApps,
  type Marketplace
} from '@/service/api/marketplace';
import { useContributesStore } from '@/store/modules/contributes';
import { useRouteStore } from '@/store/modules/route';

const route = useRoute();
const router = useRouter();
const slug = (route.query.id as string) || '';

const contributesStore = useContributesStore();
const routeStore = useRouteStore();

const loading = ref(true);
const app = ref<Marketplace.AppDetail | null>(null);
const installStatus = ref<string | null>(null);
const actionLoading = ref(false);

/** Refresh contributes cache + sidebar menus (call after any install/uninstall/enable/disable). */
async function refreshContributes() {
  await contributesStore.refresh();
  await routeStore.rebuildMenus();
}

async function loadData() {
  loading.value = true;
  try {
    const { data: detail, error } = await fetchAppDetail(slug);
    if (!error) {
      app.value = detail;
    }
    // Server-side filter by slug — no need to pull the entire installed list
    // and search client-side. size:1 because we only care about existence+status.
    const { data: installed } = await fetchInstalledApps({ appSlug: slug, size: 1 });
    if (installed && installed.records.length > 0) {
      installStatus.value = installed.records[0].status;
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
      window.$message?.success($t('page.marketplace.messages.installSuccess'));
      installStatus.value = 'installed';
      await enableApp(slug);
      installStatus.value = 'enabled';
      await refreshContributes();
    }
  } catch (e: any) {
    window.$message?.error(e?.message || $t('page.marketplace.messages.installFailed'));
  } finally {
    actionLoading.value = false;
  }
}

async function onUninstall() {
  actionLoading.value = true;
  try {
    const { error } = await uninstallApp(slug);
    if (!error) {
      window.$message?.success($t('page.marketplace.messages.uninstalled'));
      installStatus.value = null;
      await refreshContributes();
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
      window.$message?.success($t('page.marketplace.messages.enabled'));
      installStatus.value = 'enabled';
      await refreshContributes();
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
      window.$message?.success($t('page.marketplace.messages.disabled'));
      installStatus.value = 'disabled';
      await refreshContributes();
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
      <NCard v-if="app" :data-testid="`marketplace-detail-card-${app.slug}`">
        <template #header>
          <NSpace align="center" size="large">
            <NAvatar v-if="app.icon" :src="app.icon" :size="60" round />
            <NAvatar v-else :size="60" round>{{ app.name.charAt(0) }}</NAvatar>
            <div>
              <h2 class="text-xl font-bold">{{ app.name }}</h2>
              <p class="text-gray-400">
                {{ $t('page.marketplace.detail.author') }}:
                {{ app.authorName || $t('page.marketplace.browse.unknownAuthor') }}
              </p>
            </div>
          </NSpace>
        </template>

        <NSpace vertical size="large">
          <!-- Description -->
          <div>
            <h3 class="font-bold mb-2">{{ $t('page.marketplace.detail.descTitle') }}</h3>
            <p>{{ app.description || $t('page.marketplace.browse.noDescription') }}</p>
          </div>

          <!-- Stats -->
          <NSpace size="large">
            <NStatistic :label="$t('page.marketplace.detail.downloadCount')" :value="app.downloadCount" />
            <NStatistic :label="$t('page.marketplace.detail.avgRating')" :value="app.avgRating.toFixed(1)" />
            <NStatistic :label="$t('page.marketplace.detail.ratingCount')" :value="app.ratingCount" />
          </NSpace>

          <!-- Tags -->
          <NSpace>
            <NTag type="info">{{ app.category }}</NTag>
            <NTag v-for="tag in app.tags" :key="tag" size="small">{{ tag }}</NTag>
          </NSpace>
        </NSpace>

        <template #action>
          <NSpace>
            <NButton quaternary data-testid="detail-back-btn" @click="goBack">
              {{ $t('page.marketplace.actions.back') }}
            </NButton>

            <!-- Not installed -->
            <NButton
              v-if="!installStatus || installStatus === 'uninstalled'"
              type="primary"
              :loading="actionLoading"
              data-testid="detail-install-btn"
              @click="onInstall"
            >
              {{ $t('page.marketplace.actions.install') }}
            </NButton>

            <!-- Installed + enabled -->
            <template v-if="installStatus === 'enabled'">
              <NButton type="success" data-testid="detail-open-btn" @click="openApp">
                {{ $t('page.marketplace.detail.openApp') }}
              </NButton>
              <NButton :loading="actionLoading" data-testid="detail-disable-btn" @click="onDisable">
                {{ $t('page.marketplace.actions.disable') }}
              </NButton>
              <NPopconfirm @positive-click="onUninstall">
                <template #trigger>
                  <NButton type="error" :loading="actionLoading" data-testid="detail-uninstall-btn">
                    {{ $t('page.marketplace.actions.uninstall') }}
                  </NButton>
                </template>
                {{ $t('page.marketplace.detail.confirmUninstall') }}
              </NPopconfirm>
            </template>

            <!-- Installed + disabled -->
            <template v-if="installStatus === 'disabled'">
              <NButton type="primary" :loading="actionLoading" data-testid="detail-enable-btn" @click="onEnable">
                {{ $t('page.marketplace.actions.enable') }}
              </NButton>
              <NPopconfirm @positive-click="onUninstall">
                <template #trigger>
                  <NButton type="error" :loading="actionLoading" data-testid="detail-uninstall-btn">
                    {{ $t('page.marketplace.actions.uninstall') }}
                  </NButton>
                </template>
                {{ $t('page.marketplace.detail.confirmUninstall') }}
              </NPopconfirm>
            </template>

            <!-- Installed (just installed, not enabled) -->
            <template v-if="installStatus === 'installed'">
              <NButton type="primary" :loading="actionLoading" data-testid="detail-enable-btn" @click="onEnable">
                {{ $t('page.marketplace.actions.enable') }}
              </NButton>
            </template>
          </NSpace>
        </template>
      </NCard>
      <NEmpty
        v-else
        :description="$t('page.marketplace.detail.notFound')"
        class="py-20"
        data-testid="detail-not-found"
      />
    </NSpin>
  </div>
</template>
