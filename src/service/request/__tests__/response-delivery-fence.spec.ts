import { createFlatRequest } from '@sa/axios';
import { describe, expect, it } from 'vitest';

describe('response authority remains current until transformed bytes are delivered', () => {
  it('rechecks after an asynchronous JSON transformation changes the session', async () => {
    let current = true;
    const request = createFlatRequest<{ code: number; data: string }, string, Record<string, never>>(
      {
        adapter: async config => ({
          config,
          data: { code: 200, data: 'old actor' },
          headers: {},
          status: 200,
          statusText: 'ok'
        })
      },
      {
        isResponseCurrent: () => current,
        async transform(response) {
          current = false;
          return response.data.data;
        }
      }
    );
    const result = await request({ url: '/isolated' });
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('ERR_CANCELED');
  });
  it('checks binary delivery after work queued during initial response admission', async () => {
    let current = true;
    let scheduled = false;
    const request = createFlatRequest<Blob, Blob, Record<string, never>>(
      {
        adapter: async config => ({ config, data: new Blob(['old bytes']), headers: {}, status: 200, statusText: 'ok' })
      },
      {
        isResponseCurrent() {
          if (!current) return false;
          if (!scheduled) {
            scheduled = true;
            queueMicrotask(() => {
              current = false;
            });
          }
          return true;
        }
      }
    );
    const result = await request<Blob, 'blob'>({ url: '/isolated', responseType: 'blob' });
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('ERR_CANCELED');
  });
});
