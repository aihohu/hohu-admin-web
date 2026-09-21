import { expect, it, vi } from 'vitest';
vi.mock('@/service/request/platform', () => ({ platformRequest: vi.fn() }));

const { requestConfigs, flatOptions } = vi.hoisted(() => ({
  requestConfigs: [] as Array<Record<string, unknown>>,
  flatOptions: [] as Array<Record<string, unknown>>
}));

vi.mock('@sa/axios', () => ({
  BACKEND_ERROR_CODE: 'BACKEND_ERROR',
  createFlatRequest: (config: Record<string, unknown>, options: { defaultState?: Record<string, unknown> }) => {
    requestConfigs.push(config);
    flatOptions.push(options);
    const request = vi.fn() as ReturnType<typeof vi.fn> & { state: Record<string, unknown> };
    request.state = { ...options.defaultState };
    return request;
  },
  createRequest: (config: Record<string, unknown>) => {
    requestConfigs.push(config);
    return vi.fn();
  }
}));

await import('../index');

it('does not attach a credential or debug header to every backend request', () => {
  const headers = (requestConfigs[0]?.headers || {}) as Record<string, string>;
  const globalHeaderNames = Object.keys(headers);

  expect(globalHeaderNames).not.toEqual(
    expect.arrayContaining([expect.stringMatching(/token|secret|credential|debug|api[-_]?key/i)])
  );
});

it('preserves FormData as multipart before Axios transforms the body', async () => {
  const formData = new FormData();
  formData.append('file', new File(['content'], 'sample.csv', { type: 'text/csv' }));
  const config = { data: formData, headers: {} as Record<string, string> };

  const onRequest = flatOptions[0]?.onRequest as (value: typeof config) => Promise<typeof config>;
  const result = await onRequest(config);

  expect(result.data).toBe(formData);
  expect(result.headers['Content-Type']).toBe('multipart/form-data');
});
