<script setup lang="ts">
import { computed } from 'vue';
import { useResponsive } from './composables/useResponsive';
import TablePage from './TablePage.vue';
import FormPage from './FormPage.vue';

interface Props {
  manifest: Record<string, any>;
  pageKey: string;
}
const props = defineProps<Props>();

const { breakpoint } = useResponsive();

const currentPage = computed(() => {
  const pages = props.manifest.pages || [];
  return pages.find((p: any) => p.key === props.pageKey) || null;
});

const dataSchema = computed(() => {
  if (!currentPage.value) return null;
  const modelKey = currentPage.value.model;
  if (modelKey) {
    const models = props.manifest.models || [];
    const m = models.find((mm: any) => mm.key === modelKey);
    return m?.data_schema || null;
  }
  return props.manifest.data_schema || null;
});

const uiSchema = computed(() => currentPage.value?.ui_schema || {});
</script>

<template>
  <div class="h-full">
    <template v-if="currentPage">
      <TablePage
        v-if="currentPage.page_type === 'table'"
        :manifest="manifest"
        :page="currentPage"
        :data-schema="dataSchema"
        :ui-schema="uiSchema"
        :breakpoint="breakpoint"
      />
      <FormPage
        v-else-if="currentPage.page_type === 'form'"
        :manifest="manifest"
        :page="currentPage"
        :data-schema="dataSchema"
        :ui-schema="uiSchema"
        :breakpoint="breakpoint"
      />
      <NResult
        v-else
        status="info"
        title="不支持的 page_type"
        :description="currentPage.page_type"
        data-testid="lowcode-unsupported-page-type"
      />
    </template>
    <NResult
      v-else
      status="warning"
      title="页面不存在"
      :description="`page_key=${pageKey}`"
      data-testid="lowcode-page-not-found"
    />
  </div>
</template>
