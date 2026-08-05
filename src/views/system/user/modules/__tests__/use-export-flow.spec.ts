import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildExportPayload, summarizeFilter, useExportFlow } from '../use-export-flow';

vi.mock('@/service/api', () => ({
  fetchExportUsers: vi.fn()
}));

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}));

import { fetchExportUsers } from '@/service/api';

type ApiResult<T> = { data: T | null; error: any; response: any };

function ok<T>(data: T): ApiResult<T> {
  return { data, error: null, response: {} };
}

function err<T = null>(code: string, message = 'error'): ApiResult<T> {
  return { data: null, error: { code, message }, response: {} };
}

describe('buildExportPayload', () => {
  it('returns reason + null filter fields when filter is null', () => {
    const payload = buildExportPayload('每日导出', null);
    expect(payload).toEqual({
      reason: '每日导出',
      userName: null,
      nickname: null,
      userEmail: null,
      userPhone: null,
      status: null
    });
  });

  it('maps filter fields to payload (camelCase preserved)', () => {
    const filter = {
      current: 1,
      size: 10,
      status: '1' as const,
      userName: 'jack',
      nickname: null,
      userGender: null,
      userPhone: '13800000000',
      userEmail: null,
      roleCode: null
    };
    const payload = buildExportPayload('audit', filter);
    expect(payload.reason).toBe('audit');
    expect(payload.userName).toBe('jack');
    expect(payload.userPhone).toBe('13800000000');
    expect(payload.status).toBe('1');
    // not part of payload:
    expect('roleCode' in payload).toBe(false);
    expect('userGender' in payload).toBe(false);
  });
});

describe('summarizeFilter', () => {
  it('returns empty string when filter is null', () => {
    expect(summarizeFilter(null)).toBe('');
  });

  it('joins active fields with " / "', () => {
    const filter = {
      current: 1,
      size: 10,
      status: null,
      userName: 'jack',
      nickname: null,
      userGender: null,
      userPhone: null,
      userEmail: 'jack@example.com',
      roleCode: null
    };
    const summary = summarizeFilter(filter);
    expect(summary).toBe('userName=jack / userEmail=jack@example.com');
  });
});

describe('useExportFlow', () => {
  let messageSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    messageSpy = { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() };
    (window as any).$message = messageSpy;
  });

  afterEach(() => {
    delete (window as any).$message;
  });

  it('confirmExport rejects empty reason with REASON_REQUIRED', async () => {
    const flow = useExportFlow();
    const result = await flow.confirmExport();
    expect(result).toBe(false);
    expect(flow.errorCode.value).toBe('REASON_REQUIRED');
    expect(messageSpy.error).toHaveBeenCalled();
    expect(fetchExportUsers).not.toHaveBeenCalled();
  });

  it('confirmExport triggers API + Blob download on success', async () => {
    const blob = new Blob(['xlsx-bytes'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    vi.mocked(fetchExportUsers).mockResolvedValue(ok(blob));

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.fn();
    const anchorEl = { click: clickSpy, href: '', download: '' } as any;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorEl);
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchorEl);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchorEl);

    const onExported = vi.fn();
    const flow = useExportFlow({ onExported });
    flow.reason.value = '月度审计导出';

    const result = await flow.confirmExport();

    expect(result).toBe(true);
    expect(fetchExportUsers).toHaveBeenCalledWith({
      reason: '月度审计导出',
      userName: null,
      nickname: null,
      userEmail: null,
      userPhone: null,
      status: null
    });
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(anchorEl.download).toMatch(/^hohu_users_\d{8}_\d{6}\.xlsx$/);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:export-url');
    expect(messageSpy.success).toHaveBeenCalledWith('common.exportModal.exportSuccess');
    expect(onExported).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('confirmExport maps AI_EXPORT_ASYNC_REQUIRED error code to ASYNC_REQUIRED', async () => {
    vi.mocked(fetchExportUsers).mockResolvedValue(err('AI_EXPORT_ASYNC_REQUIRED'));
    const flow = useExportFlow();
    flow.reason.value = 'bulk';

    const result = await flow.confirmExport();

    expect(result).toBe(false);
    expect(flow.errorCode.value).toBe('ASYNC_REQUIRED');
    expect(messageSpy.error).toHaveBeenCalled();
  });

  it('confirmExport maps unknown error to EXPORT_FAILED', async () => {
    vi.mocked(fetchExportUsers).mockResolvedValue(err('INTERNAL_ERROR'));
    const flow = useExportFlow();
    flow.reason.value = 'bulk';

    const result = await flow.confirmExport();

    expect(result).toBe(false);
    expect(flow.errorCode.value).toBe('EXPORT_FAILED');
    expect(messageSpy.error).toHaveBeenCalled();
  });

  it('setFilter updates filterSummary reactively', async () => {
    const flow = useExportFlow();
    expect(flow.filterSummary.value).toBe('');
    flow.setFilter({
      current: 1,
      size: 10,
      status: null,
      userName: 'jack',
      nickname: null,
      userGender: null,
      userPhone: null,
      userEmail: null,
      roleCode: null
    });
    expect(flow.filterSummary.value).toBe('userName=jack');
  });

  it('reset clears reason / loading / errorCode', () => {
    const flow = useExportFlow();
    flow.reason.value = 'foo';
    flow.loading.value = true;
    flow.errorCode.value = 'EXPORT_FAILED';
    flow.reset();
    expect(flow.reason.value).toBe('');
    expect(flow.loading.value).toBe(false);
    expect(flow.errorCode.value).toBe(null);
  });
});
