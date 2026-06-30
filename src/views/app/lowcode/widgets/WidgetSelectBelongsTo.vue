<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NSelect } from 'naive-ui';
import { fetchAppData } from '@/service/api/lowcode';

interface Props {
  value?: number | string | null;
  fieldDef?: Record<string, any>;
  uiSchema?: Record<string, any>;
  manifest?: Record<string, any>;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { value: null });
const emit = defineEmits<{ 'update:value': [value: any] }>();

const options = ref<{ label: string; value: any }[]>([]);
const loading = ref(false);

const targetModel = computed(() => props.fieldDef?.['x-ref']);
const labelField = computed(() => props.fieldDef?.['x-ref-label'] || 'name');
const slug = computed(() => props.manifest?.slug);

onMounted(async () => {
  if (!slug.value || !targetModel.value) return;
  loading.value = true;
  try {
    const { data, error } = await fetchAppData(slug.value, targetModel.value, {
      size: 100
    });
    if (!error && data) {
      options.value = (data.records || []).map(r => ({
        label: String(r[labelField.value] ?? `#${r.id}`),
        value: r.id
      }));
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <NSelect
    :value="value"
    :options="options"
    :loading="loading"
    :disabled="disabled"
    :placeholder="fieldDef?.title || '请选择'"
    clearable
    filterable
    @update:value="(v: any) => emit('update:value', v)"
  />
</template>
