import { beforeEach, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock('@/service/request', () => ({ request: requestMock }));

import { fetchIsRouteExist } from '../route';

beforeEach(() => {
  requestMock.mockReset();
});

it('uses the backend snake_case query contract for route existence', () => {
  fetchIsRouteExist('system_user');

  expect(requestMock).toHaveBeenCalledWith({
    url: '/auth/isRouteExist',
    params: { route_name: 'system_user' }
  });
});
