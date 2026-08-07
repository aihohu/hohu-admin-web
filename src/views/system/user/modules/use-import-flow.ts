import { computed, ref } from 'vue';
import {
  fetchCancelImportBatch,
  fetchDownloadImportTemplate,
  fetchDryRunImportUsers,
  fetchExecuteImportUsers
} from '@/service/api';
import { $t } from '@/locales';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
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
  const step = ref<1 | 2 | 3>(1);
  const file = ref<File | null>(null);
  const reason = ref<string>('');
  const onConflict = ref<Api.SystemManage.UserImportConflictStrategy>('skip');
  const syncMode = ref<Api.SystemManage.UserImportSyncMode>('CREATE_ONLY');
  const dryRunResult = ref<Api.SystemManage.UserImportDryRunResult | null>(null);
  const executeResult = ref<Api.SystemManage.UserImportExecuteResult | null>(null);
  const loading = ref<boolean>(false);
  const errorCode = ref<ImportFlowErrorCode | null>(null);

  const canCancel = computed<boolean>(() => !!dryRunResult.value?.batchId);
  const canConfirm = computed<boolean>(() => !!file.value && !!dryRunResult.value?.previewToken && !loading.value);
  const previewTokenShort = computed<string>(() =>
    dryRunResult.value?.previewToken ? dryRunResult.value.previewToken.slice(0, 8) : ''
  );

  function reset(): void {
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
    if (f.size > MAX_FILE_SIZE_BYTES) return 'FILE_TOO_LARGE';
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
    loading.value = true;
    errorCode.value = null;
    const { data, error } = await fetchDryRunImportUsers(f, reason.value, onConflict.value);
    loading.value = false;
    if (error || !data) {
      notifyError('DRY_RUN_FAILED');
      return;
    }
    dryRunResult.value = data;
    step.value = 2;
  }

  async function confirmImport(): Promise<void> {
    if (!file.value || !dryRunResult.value) return;
    loading.value = true;
    errorCode.value = null;
    const { data, error } = await fetchExecuteImportUsers(
      file.value,
      reason.value,
      dryRunResult.value.previewToken,
      onConflict.value,
      syncMode.value
    );
    loading.value = false;
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
  }

  async function cancelImport(): Promise<boolean> {
    const batchId = dryRunResult.value?.batchId;
    if (!batchId) {
      notifyError('NO_BATCH_ID');
      return false;
    }
    loading.value = true;
    errorCode.value = null;
    const { error } = await fetchCancelImportBatch(batchId);
    loading.value = false;
    if (error) {
      notifyError('CANCEL_FAILED');
      return false;
    }
    options.onCancelled?.();
    return true;
  }

  async function downloadTemplate(): Promise<void> {
    loading.value = true;
    errorCode.value = null;
    const { data, error } = await fetchDownloadImportTemplate();
    loading.value = false;
    if (error || !data) {
      notifyError('TEMPLATE_FAILED');
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = TEMPLATE_DOWNLOAD_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    downloadTemplate
  };
}
