import { effectScope, shallowRef } from 'vue';
import { expect, it, vi } from 'vitest';
import { loadRolePolicyAnchors, useRolePolicyRepair } from '../role-policy-repair';

const context = { tenantId: '71', catalogDigest: 'catalog', headVersion: '2', epoch: '3' };

it('collects complete bounded role IDs and never copies protected business titles', async () => {
  const roles = vi
    .fn()
    .mockResolvedValueOnce({ ...context, records: [{ roleId: '100', roleName: 'SECRET' }], nextCursor: '100' })
    .mockResolvedValueOnce({ ...context, records: [{ roleId: '200', roleCode: 'SECRET' }], nextCursor: null });
  const result = await loadRolePolicyAnchors({ roles });
  expect(result).toEqual([
    { roleId: '100', delegable: false, blockedReasonCode: 'FIELD_POLICY_UNAVAILABLE' },
    { roleId: '200', delegable: false, blockedReasonCode: 'FIELD_POLICY_UNAVAILABLE' }
  ]);
});

it.each(['tenant', 'version', 'duplicate', 'overflow'])('rejects mixed or incomplete repair rows: %s', async fault => {
  const roles = vi.fn().mockResolvedValueOnce({ ...context, records: [{ roleId: '100' }], nextCursor: '100' });
  roles.mockResolvedValue({
    ...context,
    ...(fault === 'tenant' ? { tenantId: '72' } : {}),
    ...(fault === 'version' ? { headVersion: '3' } : {}),
    records:
      fault === 'overflow'
        ? Array.from({ length: 4097 }, (_, i) => ({ roleId: String(200 + i) }))
        : [{ roleId: fault === 'duplicate' ? '100' : '200' }],
    nextCursor: null
  });
  await expect(loadRolePolicyAnchors({ roles })).rejects.toThrow();
});

it('opens repair only for current dedicated authority, clear filters and the known unavailable state', async () => {
  const scope = effectScope();
  const identity = shallowRef('71/101');
  const params = { current: 1, size: 10, roleName: null };
  const roles = vi.fn().mockResolvedValue({ ...context, records: [{ roleId: '100' }], nextCursor: null });
  const fetchRoles = vi.fn().mockResolvedValue({
    data: null,
    error: { response: { data: { errorCode: 'FIELD_POLICY_UNAVAILABLE' } } },
    response: {}
  });
  const model = scope.run(() =>
    useRolePolicyRepair({ identity, params, repository: { roles }, fetchRoles, canRepair: () => true })
  )!;
  const result = await model.load();
  expect(result.data?.records).toEqual([
    { roleId: '100', delegable: false, blockedReasonCode: 'FIELD_POLICY_UNAVAILABLE' }
  ]);
  expect(model.repairMode.value).toBe(true);
  fetchRoles.mockResolvedValueOnce({
    data: null,
    error: { response: { data: { errorCode: 'MISSING_PERMISSION' } } },
    response: {}
  });
  await model.load();
  expect(roles).toHaveBeenCalledTimes(1);
  scope.stop();
});

it('discards a repair result after identity handoff', async () => {
  const scope = effectScope();
  const identity = shallowRef('71/101');
  let resolve!: (value: unknown) => void;
  const roles = vi.fn().mockImplementation(
    () =>
      new Promise(done => {
        resolve = done;
      })
  );
  const fetchRoles = vi.fn().mockResolvedValue({
    data: null,
    error: { response: { data: { errorCode: 'FIELD_POLICY_UNAVAILABLE' } } },
    response: {}
  });
  const model = scope.run(() =>
    useRolePolicyRepair({
      identity,
      params: { current: 1, size: 10 },
      repository: { roles },
      fetchRoles,
      canRepair: () => true
    })
  )!;
  const pending = model.load();
  await Promise.resolve();
  identity.value = '72/102';
  resolve({ ...context, records: [{ roleId: '100' }], nextCursor: null });
  const result = await pending;
  expect(result.data).toBeNull();
  expect(model.repairMode.value).toBe(false);
  scope.stop();
});
