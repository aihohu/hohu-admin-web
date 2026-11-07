<script setup lang="ts">
import { computed, h, shallowRef } from 'vue';
import { NButton, NDataTable, NInput, NSelect, NSpace, NTabPane, NTabs, NText, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  accessUse,
  applyBulk,
  fingerprint,
  policyGroups,
  ruleValue,
  setRule
} from '@/hooks/business/field-policy-rules';
import type { PolicyTab } from '@/hooks/business/field-policy-rules';
import { $t } from '@/locales';

const props = defineProps<{
  object: Api.FieldManagement.Object;
  rules: Api.FieldManagement.Rule[];
  disabled: boolean;
  complete: boolean;
}>();
const emit = defineEmits<{ change: [rules: Api.FieldManagement.Rule[]] }>();
const dialog = useDialog();
const tab = shallowRef<PolicyTab>('reading');
const search = shallowRef('');
const label = (key: string) => $t(`fieldPolicy.${key.replaceAll('.', '_')}`);
const purposes = computed(() => policyGroups.find(g => g.id === tab.value)?.uses ?? []);
const fields = computed(() =>
  props.object.fields.filter(f =>
    (f.fieldId + ' ' + label(f.fieldId)).toLowerCase().includes(search.value.toLowerCase())
  )
);
const columns = computed<DataTableColumns<Api.FieldManagement.Field>>(() => [
  {
    key: 'fieldId',
    title: label('field'),
    width: 150,
    fixed: 'left',
    render: f => h('div', {}, [h('div', {}, label(f.fieldId)), h(NText, { depth: 3 }, () => f.fieldId)])
  },
  ...purposes.value.map(use => ({
    key: use,
    title: label(use),
    minWidth: 150,
    render: (field: Api.FieldManagement.Field) => {
      const choices = field.choices.filter(c => accessUse(c.access) === use);
      if (!choices.length || field.structural) return h(NText, { depth: 3 }, () => label('fixed'));
      return h(
        'div',
        { class: 'flex flex-col gap-8px' },
        choices.map(choice =>
          h('div', {}, [
            h(NText, { depth: 3, class: 'text-12px' }, () =>
              [
                label(choice.access.purpose.replaceAll('.', '_')),
                label(choice.access.operation),
                ...(choice.access.use ? [label(choice.access.use)] : [])
              ].join(' · ')
            ),
            h(NSelect, {
              size: 'small',
              value: ruleValue(props.rules, field.fieldId, choice.access),
              disabled: props.disabled,
              'aria-label': [
                label(field.fieldId),
                label(use),
                choice.access.purpose,
                choice.access.operation,
                choice.access.use
              ].join(' '),
              options: choice.values.map(value => ({ value, label: label(value) })),
              onUpdateValue: (value: Api.FieldManagement.ChoiceValue) => {
                if (!props.disabled) emit('change', setRule(props.rules, field, choice.access, value));
              }
            })
          ])
        )
      );
    }
  }))
]);
function bulk(effect: 'allow' | 'deny') {
  if (props.disabled || !props.complete) return;
  const change = applyBulk(props.rules, props.object.fields, tab.value, effect);
  const before = fingerprint(props.rules);
  const object = props.object;
  const selected = tab.value;
  dialog.warning({
    title: label(effect === 'allow' ? 'bulkAllow' : 'bulkDeny'),
    content: $t('fieldPolicy.bulkSummary', {
      object: label(object.objectId),
      tab: label(tab.value),
      changed: change.changed,
      skipped: change.skipped,
      masked: change.masked
    }),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: () => {
      if (
        !props.disabled &&
        props.complete &&
        props.object === object &&
        tab.value === selected &&
        fingerprint(props.rules) === before
      )
        emit('change', change.rules);
    }
  });
}
</script>

<template>
  <NTabs v-model:value="tab" type="line" animated>
    <NTabPane v-for="group in policyGroups" :key="group.id" :name="group.id" :tab="label(group.id)" />
  </NTabs>
  <NText depth="3">{{ label(tab + 'Hint') }}</NText>
  <NInput
    v-model:value="search"
    :placeholder="label('searchFields')"
    :aria-label="label('searchFields')"
    clearable
    class="my-12px"
  />
  <NDataTable
    :columns="columns"
    :data="fields"
    :row-key="row => row.fieldId"
    size="small"
    :scroll-x="tab === 'transfer' ? 820 : 540"
  />
  <NSpace justify="space-between" align="center" class="mt-12px">
    <div class="flex flex-nowrap gap-8px">
      <slot name="recommend" />
      <NButton size="small" :disabled="disabled || !complete" @click="bulk('allow')">{{ label('bulkAllow') }}</NButton>
      <NButton size="small" type="error" ghost :disabled="disabled || !complete" @click="bulk('deny')">
        {{ label('bulkDeny') }}
      </NButton>
    </div>
    <slot name="preview" />
  </NSpace>
  <p class="mt-8px text-12px">
    <NText depth="3">{{ $t('fieldPolicy.bulkScope', { object: label(object.objectId), tab: label(tab) }) }}</NText>
  </p>
</template>
