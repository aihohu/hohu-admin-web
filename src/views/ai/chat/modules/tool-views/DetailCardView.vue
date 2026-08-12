<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  data: Api.Ai.UIResult;
}>();

const { t, te } = useI18n();
const viewData = computed(() => props.data.viewData as Api.Ai.DetailCardViewData);
const title = computed(() => {
  if (props.data.labelKey) {
    return t(props.data.labelKey, props.data.labelParams || {});
  }
  return viewData.value.title;
});
const fieldLabel = (label: string) => (te(label) ? t(label) : label);
</script>

<template>
  <div class="detail-card-view">
    <div class="title">{{ title }}</div>
    <div class="field-grid">
      <template v-for="(f, idx) in viewData.fields" :key="idx">
        <div class="label">{{ fieldLabel(f.label) }}</div>
        <code class="value">{{ f.value }}</code>
      </template>
    </div>
    <!--
 Task 33: downloadUrl 渲染在 chat-tool-call.vue 卡片底部 chip-row（常显），
         不在本组件内 — 本组件只负责字段 grid，动作按钮属于卡片级 UX 
-->
  </div>
</template>

<style scoped>
.detail-card-view {
  padding: 8px 0;
}
.title {
  font-weight: 500;
  margin-bottom: 8px;
  font-size: 13px;
}
.field-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  font-size: 12px;
}
.label {
  color: #6b7280;
}
.value {
  font-size: 13px;
}
</style>
