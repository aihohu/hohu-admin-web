<script setup lang="ts">
import { computed, watch } from 'vue';
import { useBoolean } from '@sa/hooks';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { useExportFlow } from './use-export-flow';

defineOptions({ name: 'UserExportModal' });

interface Props {
  /** filter snapshot from list page searchParams (null/empty = export all) */
  filter?: Api.SystemManage.UserSearchParams | null;
}

interface Emits {
  (e: 'exported'): void;
}

const props = withDefaults(defineProps<Props>(), { filter: null });
const emit = defineEmits<Emits>();

const { hasAuth } = useAuth();
const { bool: visible, setTrue: open, setFalse: close } = useBoolean();
const hasExportAuth = computed(() => hasAuth('system:user:export'));

const { reason, loading, errorCode, canExport, filterSummary, reset, setFilter, confirmExport } = useExportFlow({
  onExported: () => {
    emit('exported');
    close();
  }
});

watch(
  () => props.filter,
  f => setFilter(f),
  { immediate: true, deep: true }
);

async function handleConfirmExport() {
  const ok = await confirmExport();
  if (!ok && errorCode.value === 'ASYNC_REQUIRED') {
    // keep modal open so user can adjust reason / close themselves
  }
}

function handleAfterLeave(): void {
  reset();
}

defineExpose({ open });
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('common.exportModal.title')"
    class="w-500px"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NForm label-placement="top">
      <NFormItem :label="$t('common.exportModal.reasonLabel')">
        <NInput
          v-model:value="reason"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          :placeholder="$t('common.exportModal.reasonPlaceholder')"
          :maxlength="256"
          show-count
        />
      </NFormItem>
      <NFormItem v-if="filterSummary" :label="$t('common.exportModal.filterAppliedHint')">
        <NTag size="small" type="info">{{ filterSummary }}</NTag>
      </NFormItem>
      <NFormItem v-else>
        <NAlert type="info" :show-icon="true">{{ $t('common.exportModal.filterAppliedHint') }}</NAlert>
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="close">{{ $t('common.cancel') }}</NButton>
        <NButton
          v-if="hasExportAuth"
          type="primary"
          :loading="loading"
          :disabled="!canExport"
          @click="handleConfirmExport"
        >
          {{ $t('common.exportModal.confirmExport') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
