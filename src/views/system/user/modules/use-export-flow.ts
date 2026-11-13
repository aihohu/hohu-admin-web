import { computed, ref } from 'vue';
import { downloadBlob } from '@/utils/download-blob';
import { fetchExportUsers } from '@/service/api';
import { $t } from '@/locales';

const EXPORT_FILENAME_PREFIX = 'hohu_users_';
const EXPORT_FILENAME_SUFFIX = '.xlsx';

export type ExportFlowErrorCode = 'REASON_REQUIRED' | 'ASYNC_REQUIRED' | 'EXPORT_FAILED' | 'FILTER_UNSUPPORTED';

export interface UseExportFlowOptions {
  onExported?: () => void;
}

export interface ExportPayload {
  reason: string;
  userName?: string | null;
  nickname?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  status?: Api.Common.EnableStatus | null;
}

function buildFilename(): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const hms = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `${EXPORT_FILENAME_PREFIX}${ymd}_${hms}${EXPORT_FILENAME_SUFFIX}`;
}

export function buildExportPayload(reason: string, filter?: Api.SystemManage.UserSearchParams | null): ExportPayload {
  return {
    reason,
    userName: filter?.userName ?? null,
    nickname: filter?.nickname ?? null,
    userEmail: filter?.userEmail ?? null,
    userPhone: filter?.userPhone ?? null,
    status: filter?.status ?? null
  };
}

export function summarizeFilter(filter?: Api.SystemManage.UserSearchParams | null): string {
  if (!filter) return '';
  const parts: string[] = [];
  if (filter.userName) parts.push(`userName=${filter.userName}`);
  if (filter.nickname) parts.push(`nickname=${filter.nickname}`);
  if (filter.userPhone) parts.push(`userPhone=${filter.userPhone}`);
  if (filter.userEmail) parts.push(`userEmail=${filter.userEmail}`);
  if (filter.status) parts.push(`status=${filter.status}`);
  if (filter.userGender !== null && filter.userGender !== undefined) parts.push(`gender=${filter.userGender}`);
  if (filter.roleCode) parts.push(`roleCode=${filter.roleCode}`);
  return parts.length > 0 ? parts.join(' / ') : '';
}

export function useExportFlow(options: UseExportFlowOptions = {}) {
  let generation = 0;
  const reason = ref<string>('');
  const loading = ref<boolean>(false);
  const errorCode = ref<ExportFlowErrorCode | null>(null);
  const filter = ref<Api.SystemManage.UserSearchParams | null | undefined>(null);

  const unsupportedFilter = computed(() => Boolean(filter.value?.roleCode || filter.value?.userGender != null));
  const canExport = computed<boolean>(() => !!reason.value.trim() && !loading.value && !unsupportedFilter.value);
  const filterSummary = computed<string>(() => summarizeFilter(filter.value ?? null));

  function reset(): void {
    generation += 1;
    reason.value = '';
    loading.value = false;
    errorCode.value = null;
  }

  function setFilter(f: Api.SystemManage.UserSearchParams | null | undefined): void {
    generation += 1;
    loading.value = false;
    filter.value = f;
  }

  function notifyError(code: ExportFlowErrorCode): void {
    errorCode.value = code;
    const key = `common.exportModal.errorCode.${code}`;
    // @ts-expect-error dynamic i18n key from errorCode union
    const translated: string = $t(key);
    window.$message?.error(translated === key ? code : translated);
  }

  function triggerBlobDownload(blob: Blob): boolean {
    return downloadBlob(blob, buildFilename());
  }

  async function confirmExport(): Promise<boolean> {
    if (loading.value) return false;
    if (unsupportedFilter.value) {
      notifyError('FILTER_UNSUPPORTED');
      return false;
    }
    if (!reason.value.trim()) {
      notifyError('REASON_REQUIRED');
      return false;
    }
    const payload = buildExportPayload(reason.value.trim(), filter.value ?? null);
    loading.value = true;
    errorCode.value = null;
    const requestGeneration = generation;
    try {
      const { data, error } = await fetchExportUsers(payload);
      if (requestGeneration !== generation) return false;
      if (error || !(data instanceof Blob) || data.type.includes('json')) {
        const errCode = (error as any)?.code ?? null;
        if (errCode === 'AI_EXPORT_ASYNC_REQUIRED') {
          notifyError('ASYNC_REQUIRED');
        } else {
          notifyError('EXPORT_FAILED');
        }
        return false;
      }
      if (!triggerBlobDownload(data)) {
        notifyError('EXPORT_FAILED');
        return false;
      }
      window.$message?.success($t('common.exportModal.exportSuccess'));
      options.onExported?.();
      return true;
    } catch {
      if (requestGeneration === generation) notifyError('EXPORT_FAILED');
      return false;
    } finally {
      if (requestGeneration === generation) loading.value = false;
    }
  }

  return {
    reason,
    loading,
    errorCode,
    canExport,
    filterSummary,
    unsupportedFilter,
    reset,
    setFilter,
    confirmExport,
    triggerBlobDownload
  };
}
