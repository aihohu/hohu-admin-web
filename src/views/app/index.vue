<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
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
    error.value = '无效的应用路由';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    manifest.value = await fetchAppManifest(slug);
  } catch (e: any) {
    error.value = e?.message || '加载应用失败';
  } finally {
    loading.value = false;
  }
}

onMounted(loadApp);
watch(() => route.params, loadApp);
</script>

<template>
  <div class="h-full">
    <NSpin v-if="loading" class="h-full" />
    <NResult v-else-if="error" status="error" :title="error" />
    <LowcodeRenderer v-else-if="manifest" :manifest="manifest" :page-key="pageKey" />
  </div>
</template>
