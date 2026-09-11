import { expect, it, vi } from 'vitest';

const { requestConfigs } = vi.hoisted(() => ({
  requestConfigs: [] as Array<Record<string, unknown>>
}));

vi.mock('@sa/axios', () => ({
  BACKEND_ERROR_CODE: 'BACKEND_ERROR',
  createFlatRequest: (config: Record<string, unknown>, options: { defaultState?: Record<string, unknown> }) => {
    requestConfigs.push(config);
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
