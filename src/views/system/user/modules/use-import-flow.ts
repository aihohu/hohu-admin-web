import { runtimeSettings, validateUploadPolicy } from '@/utils/runtime-settings';
import { downloadBlob } from '@/utils/download-blob';
import { computed, ref, watch } from 'vue';
import {
  fetchCancelImportBatch,
  fetchDownloadImportTemplate,
  fetchDownloadImportError,
  fetchDryRunImportUsers,
  fetchExecuteImportUsers
} from '@/service/api';
import { $t } from '@/locales';

const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'];
const TEMPLATE_DOWNLOAD_FILENAME = 'user_import_template.xlsx';

export type ImportFlowErrorCode =
  | 'INVALID_MIME'
  | 'FILE_TOO_LARGE'
  | 'REASON_REQUIRED'
  | 'DRY_RUN_FAILED'
  | 'EXECUTE_FAILED'
  | 'CANCEL_FAILED'
  | 'TEMPLATE_FAILED'
  | 'NO_BATCH_ID';

export interface UseImportFlowOptions {
  onCompleted?: (result: Api.SystemManage.UserImportExecuteResult) => void;
  onCancelled?: () => void;
}

export function useImportFlow(options: UseImportFlowOptions = {}) {
  let generation = 0;
  let previewInput: { file: File; reason: string; onConflict: string } | null = null;
  const step = ref<1 | 2 | 3>(1);
  const file = ref<File | null>(null);
  const reason = ref<string>('');
  const onConflict = ref<Api.SystemManage.UserImportConflictStrategy>('skip');
  const syncMode = ref<Api.SystemManage.UserImportSyncMode>('CREATE_ONLY');
  const dryRunResult = ref<Api.SystemManage.UserImportDryRunResult | null>(null);
  const executeResult = ref<Api.SystemManage.UserImportExecuteResult | null>(null);
  const loading = ref<boolean>(false);
  const errorCode = ref<ImportFlowErrorCode | null>(null);

  const canCancel = computed<boolean>(() => !!dryRunResult.value?.batchId && !loading.value);
  const canConfirm = computed<boolean>(
    () =>
      !!file.value &&
      !!dryRunResult.value?.previewToken &&
      !loading.value &&
      previewInput?.file === file.value &&
      previewInput.reason === reason.value.trim() &&
      previewInput.onConflict === onConflict.value
  );
  watch(
    [reason, onConflict],
    () => {
      generation += 1;
      previewInput = null;
      dryRunResult.value = null;
      executeResult.value = null;
      step.value = 1;
      loading.value = false;
    },
    { flush: 'sync' }
  );
  const previewTokenShort = computed<string>(() =>
    dryRunResult.value?.previewToken ? dryRunResult.value.previewToken.slice(0, 8) : ''
  );

  function reset(): void {
    generation += 1;
    previewInput = null;
    step.value = 1;
    file.value = null;
    reason.value = '';
    onConflict.value = 'skip';
    syncMode.value = 'CREATE_ONLY';
    dryRunResult.value = null;
    executeResult.value = null;
    loading.value = false;
    errorCode.value = null;
  }

  function open(): void {
    reset();
  }

  function validateFile(f: File): ImportFlowErrorCode | null {
    const lowerName = f.name.toLowerCase();
    const extOk = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    if (!extOk) return 'INVALID_MIME';
    const policyError = validateUploadPolicy(f, runtimeSettings.value?.uploads.import);
    if (policyError) return policyError;
    return null;
  }

  function notifyError(code: ImportFlowErrorCode): void {
    errorCode.value = code;
    const key = `common.importModal.errorCode.${code}`;
    // @ts-expect-error dynamic i18n key from errorCode union
    const translated: string = $t(key);
    window.$message?.error(translated === key ? code : translated);
  }

  async function uploadFile(f: File): Promise<void> {
    if (loading.value) return;
    if (!reason.value.trim()) {
      notifyError('REASON_REQUIRED');
      return;
    }
    const validationError = validateFile(f);
    if (validationError) {
      notifyError(validationError);
      return;
    }
    file.value = f;
    dryRunResult.value = null;
    previewInput = null;
    loading.value = true;
    errorCode.value = null;
    const requestGeneration = ++generation;
    const input = { file: f, reason: reason.value.trim(), onConflict: onConflict.value };
    try {
      const { data, error } = await fetchDryRunImportUsers(f, input.reason, onConflict.value);
      if (requestGeneration !== generation) return;
      if (error || !data) {
        notifyError('DRY_RUN_FAILED');
        return;
      }
      previewInput = input;
      dryRunResult.value = data;
      step.value = 2;
    } catch {
      if (requestGeneration === generation) notifyError('DRY_RUN_FAILED');
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  async function confirmImport(): Promise<void> {
    if (!canConfirm.value || !file.value || !dryRunResult.value) return;
    loading.value = true;
    errorCode.value = null;
    const requestGeneration = generation;
    try {
      const { data, error } = await fetchExecuteImportUsers(
        file.value,
        reason.value,
        dryRunResult.value.previewToken,
        onConflict.value,
        syncMode.value
      );
      if (requestGeneration !== generation) return;
      if (error || !data) {
        notifyError('EXECUTE_FAILED');
        return;
      }
      executeResult.value = data;
      step.value = 3;
      if (data.idempotentReplay) {
        window.$message?.info($t('common.importModal.idempotentReplayHint'));
      }
      options.onCompleted?.(data);
    } catch {
      if (requestGeneration === generation) notifyError('EXECUTE_FAILED');
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  async function cancelImport(): Promise<boolean> {
    if (loading.value) return false;
    const batchId = dryRunResult.value?.batchId;
    if (!batchId) {
      notifyError('NO_BATCH_ID');
      return false;
    }
    loading.value = true;
    errorCode.value = null;
    const requestGeneration = generation;
    try {
      const { error } = await fetchCancelImportBatch(batchId);
      if (requestGeneration !== generation) return false;
      if (error) {
        notifyError('CANCEL_FAILED');
        return false;
      }
      options.onCancelled?.();
      return true;
    } catch {
      if (requestGeneration === generation) notifyError('CANCEL_FAILED');
      return false;
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  async function downloadTemplate(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    errorCode.value = null;
    const requestGeneration = generation;
    try {
      const { data, error } = await fetchDownloadImportTemplate();
      if (requestGeneration !== generation) return;
      if (error || !downloadBlob(data, TEMPLATE_DOWNLOAD_FILENAME)) {
        notifyError('TEMPLATE_FAILED');
        return;
      }
    } catch {
      if (requestGeneration === generation) notifyError('TEMPLATE_FAILED');
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  async function downloadErrors(): Promise<void> {
    const batchId = executeResult.value?.batchId;
    if (!batchId || loading.value) return;
    loading.value = true;
    const requestGeneration = generation;
    try {
      const { data, error } = await fetchDownloadImportError(batchId);
      if (requestGeneration !== generation) return;
      if (error || !downloadBlob(data, 'user_import_errors.xlsx')) {
        notifyError('TEMPLATE_FAILED');
        return;
      }
    } catch {
      if (requestGeneration === generation) notifyError('TEMPLATE_FAILED');
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  return {
    step,
    file,
    reason,
    onConflict,
    syncMode,
    dryRunResult,
    executeResult,
    loading,
    errorCode,
    canCancel,
    canConfirm,
    previewTokenShort,
    reset,
    open,
    uploadFile,
    confirmImport,
    cancelImport,
    downloadTemplate,
    downloadErrors
  };
}
