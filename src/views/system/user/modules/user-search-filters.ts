import { fetchGetUserList } from '@/service/api';

type Params = Api.SystemManage.UserSearchParams;
type Access = NonNullable<Api.SystemManage.User['fieldAccess']>;

const queryOperations = {
  userName: 'contains',
  nickname: 'contains',
  userPhone: 'contains',
  userEmail: 'contains',
  userGender: 'eq',
  status: 'eq',
  roleCode: 'eq'
} as const;

export type SearchFilter = keyof typeof queryOperations;
const keys = Object.keys(queryOperations) as SearchFilter[];

export function permittedFilters(access: Access | undefined, canReadRoles: boolean) {
  return keys.filter(key => {
    if (key === 'roleCode' && !canReadRoles) return false;
    return access?.[key === 'roleCode' ? 'roles' : key]?.queryOps?.includes(queryOperations[key]);
  });
}

export function clearUnavailable(params: Params, allowed: readonly SearchFilter[]) {
  for (const key of keys) {
    if (!allowed.includes(key)) params[key] = null;
  }
}

export async function loadSearchPage(params: Params, currentSession: () => boolean) {
  const response = await fetchGetUserList(params);
  let access = response.data?.records[0]?.fieldAccess;
  const denied = response.error?.response?.data?.errorCode === 'FIELD_QUERY_DENIED';
  const narrowed = Number(params.current) > 1 || keys.some(key => params[key] != null && params[key] !== '');
  if (currentSession() && narrowed && (denied || (!response.error && !response.data.records.length))) {
    // Capabilities cover the full search scope. Never add the probe row to the displayed result.
    const probe = await fetchGetUserList({ current: 1, size: 1 });
    access = probe.data?.records[0]?.fieldAccess;
  }
  return { response, access };
}
