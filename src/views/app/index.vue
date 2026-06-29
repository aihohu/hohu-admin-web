<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { $t } from '@/locales';
import LowcodeRenderer from './lowcode/LowcodeRenderer.vue';
import { fetchAppManifest } from '@/service/api/lowcode';

defineOptions({ name: 'AppLowcodeEntry' });

const route = useRoute();
const loading = ref(true);
const error = ref<string | null>(null);
const manifest = ref<Record<string, any> | null>(null);
const pageKey = ref<string>('');

async function loadApp() {
  const slug = route.params.slug as string;
  pageKey.value = route.params.pageKey as string;
  if (!slug || !pageKey.value) {
    error.value = $t('page.marketplace.lowcode.invalidRoute');
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const { data, error: reqError } = await fetchAppManifest(slug);
    if (reqError) {
      error.value = reqError.message || $t('page.marketplace.lowcode.loadFailed');
    } else {
      manifest.value = data;
    }
  } catch (e: any) {
    error.value = e?.message || $t('page.marketplace.lowcode.loadFailed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadApp);
watch(() => route.params, loadApp);
</script>

<template>
  <div class="h-full" data-testid="lowcode-entry-container">
    <NSpin v-if="loading" class="h-full" data-testid="lowcode-entry-loading" />
    <NResult v-else-if="error" status="error" :title="error" data-testid="lowcode-entry-error" />
    <LowcodeRenderer v-else-if="manifest" :manifest="manifest" :page-key="pageKey" />
  </div>
</template>
