import { effectScope } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  fetchExportUsers: vi.fn(),
  fetchCancelImportBatch: vi.fn(),
  fetchDownloadImportTemplate: vi.fn(),
  fetchDownloadImportError: vi.fn(),
  fetchDryRunImportUsers: vi.fn(),
  fetchExecuteImportUsers: vi.fn()
}));
const download = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/service/api', () => api);
vi.mock('@/utils/download-blob', () => ({ downloadBlob: download }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

import { useExportFlow } from '../use-export-flow';
import { useImportFlow } from '../use-import-flow';
import { localStg } from '@/utils/storage';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => {
    resolve = accept;
  });
  return { promise, resolve };
}
const success = () => ({
  data: new Blob(['isolated workbook'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  error: null,
  response: {}
});

describe('transfer scope disposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('discards an export arriving after its component scope ends', async () => {
    const pending = deferred<ReturnType<typeof success>>();
    api.fetchExportUsers.mockReturnValue(pending.promise);
    const completed = vi.fn();
    const scope = effectScope();
    const flow = scope.run(() => useExportFlow({ onExported: completed }))!;
    flow.reason.value = 'isolated export';
    const result = flow.confirmExport();
    scope.stop();
    pending.resolve(success());
    expect(await result).toBe(false);
    expect(download).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
  });

  it.each(['template', 'errors'] as const)('discards late %s bytes after scope disposal', async kind => {
    const pending = deferred<ReturnType<typeof success>>();
    api.fetchDownloadImportTemplate.mockReturnValue(pending.promise);
    api.fetchDownloadImportError.mockReturnValue(pending.promise);
    const scope = effectScope();
    const flow = scope.run(() => useImportFlow())!;
    flow.executeResult.value = {
      batchId: 'isolated-batch',
      failedRowsFile: '/file/import-error/isolated.xlsx'
    } as Api.SystemManage.UserImportExecuteResult;
    const result = kind === 'template' ? flow.downloadTemplate() : flow.downloadErrors();
    scope.stop();
    pending.resolve(success());
    await result;
    expect(download).not.toHaveBeenCalled();
  });
  it.each(['export', 'template', 'errors'] as const)(
    'does not deliver %s after identity changes while still mounted',
    async kind => {
      localStg.set('authSessionRevision', 'A');
      localStg.set('token', 'A-access');
      const pending = deferred<ReturnType<typeof success>>();
      api.fetchExportUsers.mockReturnValue(pending.promise);
      api.fetchDownloadImportTemplate.mockReturnValue(pending.promise);
      api.fetchDownloadImportError.mockReturnValue(pending.promise);
      const completed = vi.fn();
      const scope = effectScope();
      try {
        const exporter = scope.run(() => useExportFlow({ onExported: completed }))!;
        exporter.reason.value = 'isolated';
        const importer = scope.run(() => useImportFlow())!;
        importer.executeResult.value = {
          batchId: 'isolated',
          failedRowsFile: '/isolated.xlsx'
        } as Api.SystemManage.UserImportExecuteResult;
        const job =
          kind === 'export'
            ? exporter.confirmExport()
            : kind === 'template'
              ? importer.downloadTemplate()
              : importer.downloadErrors();
        localStg.set('authSessionRevision', 'B');
        localStg.set('token', 'B-access');
        pending.resolve(success());
        await job;
        expect(download).not.toHaveBeenCalled();
        expect(completed).not.toHaveBeenCalled();
      } finally {
        scope.stop();
      }
    }
  );
});
