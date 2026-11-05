<script setup lang="ts">
import { computed } from 'vue';
import type { PolicyField, PolicyRule } from '@/service/api/user-field-policy';
import { $t } from '@/locales';

const props = defineProps<{ fields: PolicyField[]; rules: PolicyRule[]; disabled: boolean }>();
const emit = defineEmits<{ update: [rules: PolicyRule[]] }>();
const fieldOptions = computed(() =>
  props.fields.map(field => ({ label: $t(`fieldPolicy.${field.fieldId}`), value: field.fieldId }))
);
const choices = (values: string[]) =>
  values.map(value => ({ label: $t(`fieldPolicy.${value.replaceAll('.', '_')}`), value }));
function options(rule: PolicyRule) {
  return props.fields.find(field => field.fieldId === rule.fieldId)?.options ?? [];
}
function purposeOptions(rule: PolicyRule) {
  return choices([...new Set(options(rule).map(option => option.purpose))]);
}
function operationOptions(rule: PolicyRule) {
  return choices(
    options(rule)
      .filter(option => option.purpose === rule.purpose)
      .map(option => option.operation)
  );
}
function readOptions(rule: PolicyRule) {
  return choices(
    ['read', 'export'].includes(rule.operation) && props.fields.find(field => field.fieldId === rule.fieldId)?.maskId
      ? ['plain', 'masked']
      : ['plain']
  );
}
function update(index: number, key: keyof PolicyRule, value: string) {
  const rules = props.rules.map(rule => ({ ...rule }));
  const rule = rules[index];
  if (key === 'fieldId') {
    const first = props.fields.find(field => field.fieldId === value)?.options[0];
    if (!first) return;
    Object.assign(rule, first, { fieldId: value, read: 'plain', maskId: null });
  } else if (key === 'purpose') {
    const first = options(rule).find(option => option.purpose === value);
    if (!first) return;
    Object.assign(rule, first, { read: 'plain', maskId: null });
  } else if (key === 'operation') Object.assign(rule, { operation: value, read: 'plain', maskId: null });
  else if (key === 'effect' && (value === 'allow' || value === 'deny')) rule.effect = value;
  else if (key === 'read' && (value === 'plain' || value === 'masked')) {
    rule.read = value;
    rule.maskId =
      value === 'masked' ? (props.fields.find(field => field.fieldId === rule.fieldId)?.maskId ?? null) : null;
  }
  emit('update', rules);
}
function add() {
  const field = props.fields[0];
  if (!field || props.rules.length >= 256) return;
  emit('update', [
    ...props.rules,
    { fieldId: field.fieldId, ...field.options[0], effect: 'allow', read: 'plain', maskId: null }
  ]);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(rule, index) in rules"
      :key="index"
      class="grid grid-cols-1 gap-2 border-b border-divider pb-4 sm:grid-cols-3"
    >
      <NFormItem :label="$t('fieldPolicy.field')">
        <NSelect
          :value="rule.fieldId"
          :options="fieldOptions"
          :disabled="disabled"
          @update:value="update(index, 'fieldId', $event)"
        />
      </NFormItem>
      <NFormItem :label="$t('fieldPolicy.purpose')">
        <NSelect
          :value="rule.purpose"
          :options="purposeOptions(rule)"
          :disabled="disabled"
          @update:value="update(index, 'purpose', $event)"
        />
      </NFormItem>
      <NFormItem :label="$t('fieldPolicy.operation')">
        <NSelect
          :value="rule.operation"
          :options="operationOptions(rule)"
          :disabled="disabled"
          @update:value="update(index, 'operation', $event)"
        />
      </NFormItem>
      <NFormItem :label="$t('fieldPolicy.effect')">
        <NSelect
          :value="rule.effect"
          :options="choices(['allow', 'deny'])"
          :disabled="disabled"
          @update:value="update(index, 'effect', $event)"
        />
      </NFormItem>
      <NFormItem :label="$t('fieldPolicy.readLevel')">
        <NSelect
          :value="rule.read"
          :options="readOptions(rule)"
          :disabled="disabled || !['read', 'export'].includes(rule.operation)"
          @update:value="update(index, 'read', $event)"
        />
      </NFormItem>
      <NButton
        :disabled="disabled"
        class="self-center"
        @click="
          emit(
            'update',
            rules.filter((_, row) => row !== index)
          )
        "
      >
        {{ $t('fieldPolicy.remove') }}
      </NButton>
    </div>
    <NButton :disabled="disabled || rules.length >= 256" class="self-start" @click="add">
      {{ $t('fieldPolicy.addRule') }}
    </NButton>
  </div>
</template>
