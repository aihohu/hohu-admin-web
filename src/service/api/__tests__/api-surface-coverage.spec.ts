import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/service/request', () => ({
  request: vi.fn().mockResolvedValue({ data: null, error: null })
}));

import * as aiAgentApi from '../ai-agent';
import * as routingFeedbackApi from '../ai-routing-feedback';
import * as traceApi from '../ai-trace';
import * as aiApi from '../ai';
import * as authApi from '../auth';
import * as lowcodeApi from '../lowcode';
import * as routeApi from '../route';
import * as systemApi from '../system';
import { request } from '@/service/request';

type ApiFunction = (...args: any[]) => unknown;

function argumentsFor(name: string): any[] {
  const file = new File(['phase4'], 'phase4.csv', { type: 'text/csv' });
  const special: Record<string, any[]> = {
    fetchLogin: ['alice', 'secret', 'default'],
    fetchUploadFile: [file, 'phase4', '1'],
    fetchBatchUploadFiles: [[file], 'phase4', '1'],
    fetchImportConfig: [file],
    fetchDryRunImportUsers: [file, 'skip', 'CREATE_ONLY'],
    fetchExecuteImportUsers: ['batch-1', 'reason'],
    fetchUpdateJob: [{ jobId: '1' }],
    fetchUpdateRoleAgentBinding: ['1', ['2']],
    fetchTestProviderModel: ['1', '2'],
    fetchUpdateProviderModel: ['1', '2', {}]
  };
  return special[name] || ['1', {}, {}];
}

async function exercise(module: Record<string, unknown>) {
  const entries = Object.entries(module).filter(
    (entry): entry is [string, ApiFunction] => typeof entry[1] === 'function'
  );
  for (const [name, fn] of entries) {
    await fn(...argumentsFor(name));
  }
  return entries.length;
}

describe('typed API wrapper surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps every System and AI wrapper connected to the shared request boundary', async () => {
    const modules = [systemApi, aiApi, aiAgentApi, routingFeedbackApi, traceApi, authApi, lowcodeApi, routeApi];
    let exercised = 0;
    for (const module of modules) exercised += await exercise(module);

    expect(request).toHaveBeenCalledTimes(exercised);
    expect(exercised).toBeGreaterThan(100);
    for (const [options] of vi.mocked(request).mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          url: expect.stringMatching(/^\//)
        })
      );
      expect(options.method === undefined || typeof options.method === 'string').toBe(true);
    }
  });

  it('preserves optional request fields and import defaults on both sides of each contract branch', async () => {
    const file = new File(['phase4'], 'phase4.csv', { type: 'text/csv' });
    await authApi.fetchLogout();
    await aiApi.fetchGetProviderModelCatalog();
    await aiApi.fetchAiQueryCache('trace-1');
    await systemApi.fetchCancelImportBatch('batch-1');
    await systemApi.fetchUploadFile(file);
    await systemApi.fetchBatchUploadFiles([file]);
    await systemApi.fetchDryRunImportUsers(file, 'reason');
    await systemApi.fetchExecuteImportUsers(file, 'reason', 'preview-1', 'overwrite', 'FULL_SYNC');

    const calls = vi.mocked(request).mock.calls.map(([options]) => options);
    expect(calls).toHaveLength(8);
    expect(calls[0].data).toEqual({});
    expect(calls[1].params).toBeUndefined();
    expect(calls[2].params).toBeUndefined();
    expect(calls[3].data).toBeUndefined();
    for (const options of calls.slice(4, 6)) {
      const data = options.data as FormData;
      expect(data.has('business_type')).toBe(false);
      expect(data.has('business_id')).toBe(false);
    }
    expect((calls[6].data as FormData).get('on_conflict')).toBe('skip');
    expect((calls[7].data as FormData).get('sync_mode')).toBe('FULL_SYNC');
  });
});
