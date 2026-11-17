<script setup lang="ts">
import { onScopeDispose, shallowRef } from 'vue';
import { publishConfig, revokeConfigPublication } from '@/service/api';
import { $t } from '@/locales';

const props = defineProps<{
  configId: string;
  publicationRevision?: string;
  revocationRevision?: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ changed: []; busy: [value: boolean]; reload: [] }>();
const busy = shallowRef(false);
const failed = shallowRef(false);
let disposed = false;
onScopeDispose(() => {
  disposed = true;
});
async function change(publish: boolean) {
  if (busy.value || props.disabled || failed.value) return;
  const revision = publish ? props.publicationRevision : props.revocationRevision;
  if (!revision) return;
  busy.value = true;
  emit('busy', true);
  try {
    const { error } = await (publish
      ? publishConfig(props.configId, revision)
      : revokeConfigPublication(props.configId, revision));
    if (disposed) return;
    failed.value = Boolean(error);
    if (!error) emit('changed');
  } catch {
    if (!disposed) failed.value = true;
  } finally {
    if (!disposed) {
      busy.value = false;
      emit('busy', false);
    }
  }
}
</script>

<template>
  <NSpace v-if="publicationRevision || revocationRevision" vertical>
    <NAlert type="info">{{ $t('fieldPolicy.publicationHint') }}</NAlert>
    <NAlert v-if="failed" type="error">
      {{ $t('fieldPolicy.publicationConflict') }}
      <NButton text @click="emit('reload')">{{ $t('common.refresh') }}</NButton>
    </NAlert>
    <NSpace>
      <NPopconfirm v-if="publicationRevision" :disabled="disabled || busy || failed" @positive-click="change(true)">
        <template #trigger>
          <NButton type="warning" :disabled="disabled || busy || failed" :loading="busy">
            {{ $t('fieldPolicy.publishConfig') }}
          </NButton>
        </template>
        {{ $t('fieldPolicy.publishConfigConfirm') }}
      </NPopconfirm>
      <NPopconfirm v-if="revocationRevision" :disabled="disabled || busy || failed" @positive-click="change(false)">
        <template #trigger>
          <NButton :disabled="disabled || busy || failed" :loading="busy">{{ $t('fieldPolicy.revokeConfig') }}</NButton>
        </template>
        {{ $t('fieldPolicy.revokeConfigConfirm') }}
      </NPopconfirm>
    </NSpace>
  </NSpace>
</template>
