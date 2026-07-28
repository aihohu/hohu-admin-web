<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  data: Api.Ai.UIResult;
}>();

const { t } = useI18n();

const viewData = computed(() => props.data.viewData as Api.Ai.RowsAffectedViewData);
const label = computed(() => {
  if (props.data.labelKey) {
    return t(props.data.labelKey, { count: viewData.value.count, ...props.data.labelParams });
  }
  return `已影响 ${viewData.value.count} 行`;
});
</script>

<template>
  <div class="rows-affected-view">
    <div class="count-badge">{{ viewData.count }}</div>
    <div class="label">{{ label }}</div>
    <details v-if="viewData.ids && viewData.ids.length > 0" class="ids-detail">
      <summary>查看 ID 列表（{{ viewData.ids.length }}）</summary>
      <pre>{{ viewData.ids.join(', ') }}</pre>
    </details>
  </div>
</template>

<style scoped>
.rows-affected-view {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.count-badge {
  background: #10b981;
  color: #fff;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.label {
  font-size: 13px;
}
.ids-detail summary {
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
}
.ids-detail pre {
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  max-height: 100px;
  overflow: auto;
}
</style>
