import { describe, expect, it, vi } from 'vitest';
import { fetchGetUserList } from '@/service/api';
import { clearUnavailable, loadSearchPage, permittedFilters } from '../user-search-filters';

vi.mock('@/service/api', () => ({ fetchGetUserList: vi.fn() }));

const grant = (queryOps: string[], read: Api.SystemManage.UserFieldAccess['read'] = 'plain') => ({
  queryOps,
  read,
  maskId: null,
  create: false,
  update: false,
  replace: false
});
const access = {
  nickname: grant([]),
  userName: grant(['contains']),
  userPhone: grant(['eq']),
  roles: grant(['eq']),
  status: grant(['eq'], 'hidden')
};

describe('user list query controls', () => {
  it('checks the exact query operation and the role option permission independently of read level', () => {
    expect(permittedFilters(access, false)).toEqual(['userName', 'status']);
    expect(permittedFilters(access, true)).toEqual(['userName', 'status', 'roleCode']);
    expect(permittedFilters({ roles: grant([]) }, true)).toEqual([]);
    const params = { current: 1, size: 10, nickname: 'old', userPhone: 'old', userName: 'keep', roleCode: 'old' };
    clearUnavailable(params, permittedFilters(access, false));
    expect(params).toMatchObject({
      current: 1,
      size: 10,
      nickname: null,
      userPhone: null,
      userName: 'keep',
      roleCode: null
    });
    clearUnavailable(params, []);
    expect(params.userName).toBeNull();
  });

  it.each(['empty', 'denied'])('refreshes capabilities after %s without displaying the probe record', async kind => {
    const first =
      kind === 'empty'
        ? { data: { records: [] }, error: null }
        : { data: null, error: { response: { data: { errorCode: 'FIELD_QUERY_DENIED' } } } };
    const list = vi.mocked(fetchGetUserList, { partial: true, deep: true });
    list.mockReset();
    list.mockResolvedValueOnce(first);
    list.mockResolvedValueOnce({ data: { records: [{ userId: '1', fieldAccess: access }] }, error: null });
    const result = await loadSearchPage({ current: 1, size: 10, nickname: 'old' }, () => true);
    expect(result.response).toBe(first);
    expect(result.access).toEqual(access);
    expect(list.mock.calls[1]).toEqual([{ current: 1, size: 1 }]);
  });
});
