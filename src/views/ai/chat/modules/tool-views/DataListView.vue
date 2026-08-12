<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  data: Api.Ai.UIResult;
}>();

const viewData = computed(() => props.data.viewData as Api.Ai.DataListViewData);
const { t, te } = useI18n();
const columnLabel = (label: string) => (te(label) ? t(label) : label);
</script>

<template>
  <div class="data-list-view">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="col in viewData.columns" :key="col.key">{{ columnLabel(col.label) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in viewData.rows" :key="idx">
          <td v-for="col in viewData.columns" :key="col.key">
            <code>{{ row[col.key] ?? '' }}</code>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th,
.data-table td {
  border: 1px solid var(--n-border-color, #e5e7eb);
  padding: 4px 8px;
  text-align: left;
}
.data-table th {
  background: var(--n-color-target, #f9fafb);
  font-weight: 500;
}
</style>
