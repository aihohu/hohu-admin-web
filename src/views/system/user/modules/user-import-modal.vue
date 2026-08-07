<script setup lang="ts">
import { computed } from 'vue';
import type { DataTableColumns, UploadFileInfo } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { $t } from '@/locales';
import { useImportFlow } from './use-import-flow';

defineOptions({ name: 'UserImportModal' });

interface Props {
  defaultPassword?: string;
}

interface Emits {
  (e: 'completed', result: Api.SystemManage.UserImportExecuteResult): void;
  (e: 'cancelled'): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { bool: visible, setTrue: open, setFalse: close } = useBoolean();

const {
  step,
  file,
  reason,
  onConflict,
  syncMode,
  dryRunResult,
  executeResult,
  loading,
  canCancel,
  canConfirm,
  previewTokenShort,
  reset,
  uploadFile,
  confirmImport,
  cancelImport,
  downloadTemplate
} = useImportFlow({
  onCompleted: result => {
    emit('completed', result);
    emit('success');
  },
  onCancelled: () => {
    emit('cancelled');
    close();
  }
});

const stepItems = computed(() => [
  { title: $t('common.importModal.step1Title') },
  { title: $t('common.importModal.step2Title') },
  { title: $t('common.importModal.step3Title') }
]);

const conflictPreview = computed(() => dryRunResult.value?.conflictRecords.slice(0, 20) ?? []);
const outOfScopePreview = computed(() => dryRunResult.value?.outOfScopeRecords.slice(0, 10) ?? []);
const failedRowsPreview = computed(() => executeResult.value?.failedRowsPreview.slice(0, 20) ?? []);

const onConflictOptions = computed(() => [
  { label: $t('common.importModal.onConflictSkip'), value: 'skip' as const },
  { label: $t('common.importModal.onConflictOverwrite'), value: 'overwrite' as const },
  { label: $t('common.importModal.onConflictFailFast'), value: 'fail_fast' as const }
]);

const syncModeOptions = computed(() => [
  { label: $t('common.importModal.syncModeCreateOnly'), value: 'CREATE_ONLY' as const },
  { label: $t('common.importModal.syncModeUpdateProfile'), value: 'UPDATE_PROFILE' as const },
  { label: $t('common.importModal.syncModeFullSync'), value: 'FULL_SYNC' as const }
]);

const previewTitleText = computed(() =>
  $t('common.importModal.previewTitle', { total: dryRunResult.value?.total ?? 0 })
);

const defaultPasswordHint = computed(() =>
  props.defaultPassword ? $t('page.system.user.defaultPasswordHint', { password: props.defaultPassword }) : ''
);

const resultStatus = computed<'success' | 'error' | 'warning'>(() => {
  if (!executeResult.value) return 'warning';
  if (executeResult.value.status === 'SUCCESS') return 'success';
  if (executeResult.value.status === 'FAILED') return 'error';
  return 'warning';
});

interface ErrorRow {
  rowNum: number;
  field: string;
  value: string;
  reason: string;
}

const errorColumns: DataTableColumns<ErrorRow> = [
  { title: 'Row', key: 'rowNum', width: 80 },
  { title: 'Field', key: 'field', width: 140 },
  { title: 'Value', key: 'value', ellipsis: { tooltip: true } },
  { title: 'Reason', key: 'reason' }
];

function handleFileChange({ file: entry }: { file: UploadFileInfo }) {
  if (entry?.file) {
    uploadFile(entry.file);
  }
}

function handleAfterLeave() {
  reset();
}

defineExpose({ open });
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('common.importModal.title')"
    class="w-800px"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NSteps :current="step" size="small" class="mb-24px">
      <NStep v-for="(s, i) in stepItems" :key="i" :title="s.title" />
    </NSteps>

    <!-- Step 1: Upload -->
    <div v-if="step === 1">
      <NForm label-placement="top">
        <NFormItem :label="$t('common.importModal.reasonLabel')">
          <NInput
            v-model:value="reason"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            :placeholder="$t('common.importModal.reasonPlaceholder')"
            :maxlength="256"
            show-count
          />
        </NFormItem>
        <NFormItem :label="$t('common.importModal.step1Title')">
          <NUpload
            :show-file-list="false"
            :default-upload="false"
            accept=".xlsx,.csv"
            :max="1"
            :disabled="loading"
            @change="handleFileChange"
          >
            <NUploadDragger>
              <div class="mb-12px">
                <IconIcRoundCloudUpload class="text-48px text-gray-400" />
              </div>
              <NText>{{ $t('common.importModal.uploadHint') }}</NText>
              <NP depth="3" class="m-0 mt-8px">{{ $t('common.importModal.uploadDesc') }}</NP>
            </NUploadDragger>
          </NUpload>
        </NFormItem>
      </NForm>
      <NSpace justify="end">
        <NButton :loading="loading" @click="downloadTemplate">
          <template #icon>
            <IconIcRoundDownload class="text-icon" />
          </template>
          {{ $t('common.importModal.downloadTemplate') }}
        </NButton>
      </NSpace>
    </div>

    <!-- Step 2: Preview -->
    <div v-else-if="step === 2">
      <div class="mb-16px flex items-center justify-between">
        <NText strong>{{ file?.name }}</NText>
        <NButton size="small" :disabled="!canCancel" :loading="loading" @click="cancelImport">
          {{ $t('common.importModal.cancelImport') }}
        </NButton>
      </div>

      <NText depth="2">{{ previewTitleText }}</NText>

      <!-- 4 stat cards -->
      <div class="my-16px grid grid-cols-4 gap-12px">
        <NCard size="small" class="text-center">
          <NStatistic :label="$t('common.importModal.previewNew')" :value="dryRunResult?.newCount ?? 0" />
        </NCard>
        <NCard size="small" class="text-center">
          <NStatistic :label="$t('common.importModal.previewExists')" :value="dryRunResult?.existsCount ?? 0" />
        </NCard>
        <NCard size="small" class="text-center">
          <NStatistic :label="$t('common.importModal.previewConflict')" :value="dryRunResult?.conflictCount ?? 0">
            <template #suffix>
              <NText v-if="dryRunResult?.conflictRecordsTruncated" type="warning" class="text-12px">
                ({{ $t('common.importModal.conflictRecordsTruncatedHint') }})
              </NText>
            </template>
          </NStatistic>
        </NCard>
        <NCard size="small" class="text-center">
          <NStatistic :label="$t('common.importModal.previewOutOfScope')" :value="dryRunResult?.outOfScopeCount ?? 0">
            <template #suffix>
              <NText v-if="dryRunResult?.outOfScopeRecordsTruncated" type="warning" class="text-12px">
                ({{ $t('common.importModal.outOfScopeRecordsTruncatedHint') }})
              </NText>
            </template>
          </NStatistic>
        </NCard>
      </div>

      <!-- Conflict strategy -->
      <NFormItem :label="$t('common.importModal.onConflictLabel')" label-placement="left" :label-width="120">
        <NRadioGroup v-model:value="onConflict">
          <NSpace vertical>
            <NRadio v-for="opt in onConflictOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItem>

      <!-- Sync mode -->
      <NFormItem :label="$t('common.importModal.syncModeLabel')" label-placement="left" :label-width="120">
        <NRadioGroup v-model:value="syncMode">
          <NSpace vertical>
            <NRadio v-for="opt in syncModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItem>

      <!-- Error list preview (top 20) -->
      <NTabs type="line" class="mt-16px">
        <NTabPane
          :tab="`${$t('common.importModal.previewConflict')} (${dryRunResult?.conflictCount ?? 0})`"
          name="conflict"
        >
          <NDataTable :columns="errorColumns" :data="conflictPreview" size="small" :max-height="240" />
        </NTabPane>
        <NTabPane
          :tab="`${$t('common.importModal.previewOutOfScope')} (${dryRunResult?.outOfScopeCount ?? 0})`"
          name="oos"
        >
          <NDataTable :columns="errorColumns" :data="outOfScopePreview" size="small" :max-height="240" />
        </NTabPane>
      </NTabs>

      <!-- Preview token display -->
      <NSpace class="mt-16px" align="center">
        <NText depth="3">{{ $t('common.importModal.previewTokenLabel') }}:</NText>
        <NTag size="small" type="info">{{ previewTokenShort }}…</NTag>
      </NSpace>
    </div>

    <!-- Step 3: Result -->
    <div v-else>
      <NResult :status="resultStatus" :title="$t('common.importModal.resultTitle')">
        <template #footer>
          <div class="grid grid-cols-4 gap-12px text-center">
            <NStatistic :label="$t('common.importModal.previewNew')" :value="executeResult?.successCount ?? 0" />
            <NStatistic :label="$t('common.importModal.previewExists')" :value="executeResult?.skippedCount ?? 0" />
            <NStatistic
              :label="$t('common.importModal.onConflictOverwrite')"
              :value="executeResult?.overwrittenCount ?? 0"
            />
            <NStatistic :label="$t('common.importModal.previewConflict')" :value="executeResult?.failedCount ?? 0" />
          </div>
        </template>
      </NResult>

      <!-- Failed rows preview -->
      <div v-if="failedRowsPreview.length > 0" class="mt-16px">
        <NText depth="2">{{ $t('common.importModal.downloadFailedRows') }}</NText>
        <NDataTable :columns="errorColumns" :data="failedRowsPreview" size="small" :max-height="240" class="mt-8px" />
        <NSpace v-if="executeResult?.failedRowsFile" justify="end" class="mt-8px">
          <NButton tag="a" :href="executeResult.failedRowsFile" target="_blank" rel="noopener noreferrer">
            {{ $t('common.importModal.downloadFailedRows') }}
          </NButton>
        </NSpace>
      </div>

      <!-- Default password hint -->
      <NAlert v-if="defaultPasswordHint" type="info" class="mt-16px" :show-icon="true">
        {{ defaultPasswordHint }}
      </NAlert>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="close">{{ $t('common.close') }}</NButton>
        <NButton v-if="step === 2" type="primary" :loading="loading" :disabled="!canConfirm" @click="confirmImport">
          {{ $t('common.importModal.confirmImport') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
