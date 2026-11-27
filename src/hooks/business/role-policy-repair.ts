import { onScopeDispose, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { FieldPolicyError } from '@/service/api/field-policy-contract';
import type { FieldPolicyRepository } from '@/service/api/field-policy-contract';
import type { fetchGetRoleList } from '@/service/api/system';

type RoleResult = Awaited<ReturnType<typeof fetchGetRoleList>>;
type RoleRepository = Pick<FieldPolicyRepository, 'roles'>;

export async function loadRolePolicyAnchors(repo: RoleRepository, signal?: AbortSignal, includeTitles = false) {
  const records: Api.SystemManage.RoleSummary[] = [];
  let cursor = '0';
  let previous = 0n;
  let context: Api.FieldManagement.RolePage | undefined;
  for (let pageCount = 0; pageCount < 64; pageCount++) {
    const page = await repo.roles(cursor, signal);
    const before = context;
    const keys = ['tenantId', 'catalogDigest', 'headVersion', 'epoch'] as const;
    if (before && keys.some(key => page[key] !== before[key]))
      throw new FieldPolicyError('FIELD_POLICY_VERSION_CONFLICT', 409);
    context = page;
    if (!Array.isArray(page.records) || page.records.length > 100)
      throw new FieldPolicyError('FIELD_POLICY_UNAVAILABLE', 503);
    for (const role of page.records) {
      if (
        typeof role.roleId !== 'string' ||
        !/^[1-9][0-9]{0,18}$/.test(role.roleId) ||
        BigInt(role.roleId) >= 2n ** 63n ||
        BigInt(role.roleId) <= previous ||
        records.length >= 4096
      )
        throw new FieldPolicyError('FIELD_POLICY_UNAVAILABLE', 503);
      previous = BigInt(role.roleId);
      records.push({
        roleId: role.roleId,
        delegable: false,
        blockedReasonCode: 'FIELD_POLICY_UNAVAILABLE',
        ...(includeTitles && typeof role.roleName === 'string' ? { roleName: role.roleName } : {}),
        ...(includeTitles && typeof role.roleCode === 'string' ? { roleCode: role.roleCode } : {})
      });
    }
    if (page.nextCursor === null) return records;
    if (!page.records.length || page.nextCursor !== page.records.at(-1)?.roleId)
      throw new FieldPolicyError('FIELD_POLICY_VERSION_CONFLICT', 409);
    cursor = page.nextCursor;
  }
  throw new FieldPolicyError('FIELD_POLICY_UNAVAILABLE', 503);
}

export function useRolePolicyRepair(options: {
  identity: Ref<string>;
  params: Api.SystemManage.RoleSearchParams;
  repository: RoleRepository;
  fetchRoles: () => ReturnType<typeof fetchGetRoleList>;
  canRepair: () => boolean;
}) {
  const repairMode = shallowRef(false);
  let generation = 0;
  let abort = new AbortController();
  function reset() {
    generation++;
    abort.abort();
    abort = new AbortController();
    repairMode.value = false;
  }
  watch(options.identity, reset, { flush: 'sync' });
  onScopeDispose(reset);
  function emptyPage(): Api.SystemManage.RoleList {
    return {
      records: [],
      current: 1,
      size: 10,
      total: 0,
      fieldPolicy: { read: [], query: [], create: [], update: [], canCreate: false }
    };
  }
  async function load(): Promise<RoleResult> {
    reset();
    const current = generation;
    const params = { ...options.params };
    const result = await options.fetchRoles();
    if (current !== generation) return result.error ? result : { ...result, data: emptyPage() };
    const body = result.error?.response?.data as { errorCode?: string } | undefined;
    const filtered = Object.entries(params).some(
      ([key, value]) => !['current', 'size'].includes(key) && value !== null && value !== undefined && value !== ''
    );
    const fieldRefusal = body?.errorCode === 'FIELD_POLICY_UNAVAILABLE' || body?.errorCode === 'FIELD_POLICY_DENIED';
    if (!result.error || !options.canRepair() || filtered || !fieldRefusal) return result;
    try {
      const rows = await loadRolePolicyAnchors(options.repository, abort.signal);
      if (current !== generation || !options.canRepair()) return result;
      const page = params.current ?? 1;
      const size = params.size ?? 10;
      if (
        !Number.isSafeInteger(page) ||
        !Number.isSafeInteger(size) ||
        page < 1 ||
        page > 4096 ||
        size < 1 ||
        size > 100
      )
        return result;
      repairMode.value = true;
      return {
        ...result,
        error: null,
        data: {
          ...emptyPage(),
          records: rows.slice((page - 1) * size, page * size),
          total: rows.length,
          current: page,
          size
        }
      };
    } catch {
      return result;
    }
  }
  return { repairMode, load };
}
