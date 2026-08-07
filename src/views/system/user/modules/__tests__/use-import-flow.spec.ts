import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImportFlow } from '../use-import-flow';

vi.mock('@/service/api', () => ({
  fetchDryRunImportUsers: vi.fn(),
  fetchExecuteImportUsers: vi.fn(),
  fetchCancelImportBatch: vi.fn(),
  fetchDownloadImportTemplate: vi.fn()
}));

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

import {
  fetchCancelImportBatch,
  fetchDownloadImportTemplate,
  fetchDryRunImportUsers,
  fetchExecuteImportUsers
} from '@/service/api';

type ApiResult<T> = { data: T | null; error: any; response: any };

function ok<T>(data: T): ApiResult<T> {
  return { data, error: null, response: {} };
}

const FIXTURE_DRY_RUN = {
  total: 100,
  newRecords: [],
  existsRecords: [],
  conflictRecords: [],
  outOfScopeRecords: [],
  newRecordsTruncated: false,
  existsRecordsTruncated: false,
  conflictRecordsTruncated: false,
  outOfScopeRecordsTruncated: false,
  conflictRecordsFile: null,
  outOfScopeRecordsFile: null,
  newCount: 80,
  existsCount: 15,
  conflictCount: 3,
  outOfScopeCount: 2,
  batchId: 'batch-123',
  previewToken: 'tok-abcdefgh1234567890',
  expiresAt: '2026-08-04T20:00:00Z'
};

const FIXTURE_EXECUTE = {
  batchId: 'batch-123',
  status: 'SUCCESS' as const,
  successCount: 80,
  skippedCount: 15,
  overwrittenCount: 0,
  failedCount: 5,
  failedRowsFile: '/file/import-error/batch-123.xlsx',
  failedRowsPreview: [],
  idempotentReplay: false
};

describe('useImportFlow', () => {
  let messageSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    messageSpy = { error: vi.fn(), info: vi.fn(), success: vi.fn() };
    (window as any).$message = messageSpy;
  });

  afterEach(() => {
    delete (window as any).$message;
  });

  it('uploadFile triggers dry_run and advances to step 2', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok(FIXTURE_DRY_RUN));
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    const file = new File(['payload'], 'users.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    await flow.uploadFile(file);

    expect(fetchDryRunImportUsers).toHaveBeenCalledWith(file, '导入测试用户', 'skip');
    expect(flow.step.value).toBe(2);
    expect(flow.dryRunResult.value?.newCount).toBe(80);
    expect(flow.dryRunResult.value?.conflictCount).toBe(3);
    expect(flow.previewTokenShort.value).toBe('tok-abcd');
  });

  it('uploadFile rejects file > 10MB with FILE_TOO_LARGE', async () => {
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'big.xlsx');
    await flow.uploadFile(oversized);

    expect(fetchDryRunImportUsers).not.toHaveBeenCalled();
    expect(flow.errorCode.value).toBe('FILE_TOO_LARGE');
    expect(messageSpy.error).toHaveBeenCalled();
  });

  it('uploadFile rejects invalid extension with INVALID_MIME', async () => {
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    const bad = new File(['x'], 'users.txt');
    await flow.uploadFile(bad);

    expect(fetchDryRunImportUsers).not.toHaveBeenCalled();
    expect(flow.errorCode.value).toBe('INVALID_MIME');
  });

  it('uploadFile rejects legacy xls until a safe parser is available', async () => {
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    await flow.uploadFile(new File(['legacy'], 'users.xls'));

    expect(fetchDryRunImportUsers).not.toHaveBeenCalled();
    expect(flow.errorCode.value).toBe('INVALID_MIME');
  });

  it('uploadFile requires non-empty reason', async () => {
    const flow = useImportFlow();
    const file = new File(['x'], 'users.xlsx');
    await flow.uploadFile(file);

    expect(fetchDryRunImportUsers).not.toHaveBeenCalled();
    expect(flow.errorCode.value).toBe('REASON_REQUIRED');
  });

  it('confirmImport calls execute and advances to step 3', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok(FIXTURE_DRY_RUN));
    vi.mocked(fetchExecuteImportUsers).mockResolvedValue(ok(FIXTURE_EXECUTE));
    const completed = vi.fn();
    const flow = useImportFlow({ onCompleted: completed });
    flow.reason.value = '导入测试用户';

    const file = new File(['payload'], 'users.xlsx');
    await flow.uploadFile(file);
    await flow.confirmImport();

    expect(fetchExecuteImportUsers).toHaveBeenCalledWith(
      file,
      '导入测试用户',
      'tok-abcdefgh1234567890',
      'skip',
      'CREATE_ONLY'
    );
    expect(flow.step.value).toBe(3);
    expect(flow.executeResult.value?.successCount).toBe(80);
    expect(completed).toHaveBeenCalledWith(FIXTURE_EXECUTE);
  });

  it('confirmImport with idempotentReplay=true triggers info toast', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok(FIXTURE_DRY_RUN));
    vi.mocked(fetchExecuteImportUsers).mockResolvedValue(ok({ ...FIXTURE_EXECUTE, idempotentReplay: true }));
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    const file = new File(['payload'], 'users.xlsx');
    await flow.uploadFile(file);
    await flow.confirmImport();

    expect(messageSpy.info).toHaveBeenCalledWith('common.importModal.idempotentReplayHint');
  });

  it('cancelImport returns true and emits onCancelled when batchId present', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok(FIXTURE_DRY_RUN));
    vi.mocked(fetchCancelImportBatch).mockResolvedValue(ok({ cancelledAt: '2026-08-04T16:00:00Z' }));
    const cancelled = vi.fn();
    const flow = useImportFlow({ onCancelled: cancelled });
    flow.reason.value = '导入测试用户';

    await flow.uploadFile(new File(['x'], 'users.xlsx'));
    const result = await flow.cancelImport();

    expect(fetchCancelImportBatch).toHaveBeenCalledWith('batch-123');
    expect(result).toBe(true);
    expect(cancelled).toHaveBeenCalled();
  });

  it('cancelImport returns false and sets NO_BATCH_ID when batchId missing', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok({ ...FIXTURE_DRY_RUN, batchId: undefined }));
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';

    await flow.uploadFile(new File(['x'], 'users.xlsx'));
    const result = await flow.cancelImport();

    expect(fetchCancelImportBatch).not.toHaveBeenCalled();
    expect(result).toBe(false);
    expect(flow.errorCode.value).toBe('NO_BATCH_ID');
  });

  it('downloadTemplate triggers Blob download via createObjectURL', async () => {
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    vi.mocked(fetchDownloadImportTemplate).mockResolvedValue(ok(blob));

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi.fn();
    const anchorEl = { click: clickSpy, href: '', download: '' } as any;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorEl);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchorEl);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchorEl);

    const flow = useImportFlow();
    await flow.downloadTemplate();

    expect(fetchDownloadImportTemplate).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(anchorEl.download).toBe('user_import_template.xlsx');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('open() resets state to step 1', async () => {
    vi.mocked(fetchDryRunImportUsers).mockResolvedValue(ok(FIXTURE_DRY_RUN));
    const flow = useImportFlow();
    flow.reason.value = '导入测试用户';
    await flow.uploadFile(new File(['x'], 'users.xlsx'));
    expect(flow.step.value).toBe(2);

    flow.open();
    expect(flow.step.value).toBe(1);
    expect(flow.file.value).toBeNull();
    expect(flow.dryRunResult.value).toBeNull();
    expect(flow.reason.value).toBe('');
  });
});
