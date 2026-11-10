<script setup lang="ts">
import { NAlert, NDataTable } from 'naive-ui';
import { computed } from 'vue';
import { $t } from '@/locales';
import { ruleKey } from '@/hooks/business/field-policy-rules';
defineProps<{ preview: Api.FieldManagement.Preview }>();
const label = (key: string) => $t(`fieldPolicy.${key.replaceAll('.', '_')}`);
const fieldLabel = (key: string) => label(key === 'title' ? 'data_title' : key);
function describe(value: Api.FieldManagement.Rule | null) {
  return value ? label(value.effect) + (value.effect === 'allow' ? ' / ' + label(value.level) : '') : label('unset');
}
const columns = computed(() => [
  {
    key: 'fieldId',
    title: label('field'),
    render: (row: Api.FieldManagement.Preview['diff'][number]) => fieldLabel(row.fieldId)
  },
  {
    key: 'access',
    title: label('purpose'),
    render: (row: Api.FieldManagement.Preview['diff'][number]) =>
      label(row.access.purpose.replaceAll('.', '_')) + ' / ' + label(row.access.operation)
  },
  {
    key: 'before',
    title: label('before'),
    render: (row: Api.FieldManagement.Preview['diff'][number]) => describe(row.before)
  },
  {
    key: 'after',
    title: label('after'),
    render: (row: Api.FieldManagement.Preview['diff'][number]) => describe(row.after)
  }
]);
</script>

<template>
  <section class="my-16px" :aria-label="label('preview')">
    <NAlert type="info" class="mb-12px">{{ label('abstractPreview') }}</NAlert>
    <NDataTable :columns="columns" :data="preview.diff" :row-key="ruleKey" size="small" :scroll-x="550" />
    <p v-if="preview.sampleTruncated">{{ label('samplesTruncated') }}</p>
  </section>
</template>
