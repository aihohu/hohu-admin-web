import { effectScope, shallowRef } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useFieldPolicy } from '../field-policy-management';
import { FieldPolicyError } from '@/service/api/field-policy-contract';
import type { FieldPolicyRepository } from '@/service/api/field-policy-contract';

const context = {
  catalogDigest: 'catalog',
  headVersion: '1',
  epoch: '1',
  tenantId: '0',
  activeManifestDigest: null,
  candidateManifestDigest: null,
  capabilities: { view: true, edit: true, activate: false, freeze: false }
};
function repository() {
  return {
    catalog: vi.fn().mockResolvedValue({
      ...context,
      objects: [{ objectId: 'system.user', fields: [] }],
      complete: true,
      nextCursor: null
    }),
    object: vi.fn().mockResolvedValue({
      ...context,
      objectId: 'system.user',
      role: { roleId: '201' },
      bindingVersion: '0',
      rules: []
    }),
    manifest: vi.fn().mockResolvedValue({
      ...context,
      items: [],
      objects: [],
      canActivate: false,
      activationBlockers: ['FULL_SYSTEM_ACCEPTANCE_REQUIRED']
    }),
    preview: vi.fn().mockResolvedValue({
      ...context,
      previewDigest: 'signed',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      diff: []
    }),
    publish: vi.fn().mockResolvedValue({ headVersion: '2' }),
    receipt: vi.fn().mockResolvedValue(null),
    roles: vi.fn(),
    previewManifest: vi.fn(),
    build: vi.fn(),
    freeze: vi.fn()
  } satisfies FieldPolicyRepository;
}
function setup(repo = repository()) {
  const scope = effectScope();
  const role = shallowRef('201');
  const identity = shallowRef('tenant0/actor101');
  const model = scope.run(() => useFieldPolicy({ roleId: role, identity, repository: repo }))!;
  return { model, repo, scope, role, identity };
}

describe('real policy management draft lifecycle', () => {
  it('loads all ten catalog objects without inheriting a grant for a new control object', async () => {
    const { model, repo, scope } = setup();
    const ids = [
      'system.user',
      'system.dict_type',
      'system.dict_data',
      'system.data_scope_demo',
      'system.role',
      'system.dept',
      'system.menu',
      'system.config',
      'system.setting',
      'job.definition'
    ];
    repo.catalog.mockResolvedValue({
      ...context,
      objects: ids.map(objectId => ({ objectId, fields: [] })),
      complete: true,
      nextCursor: null
    });
    await model.load();
    expect(model.catalog.value?.objects.map(object => object.objectId)).toEqual(ids);
    repo.object.mockResolvedValue({
      ...context,
      objectId: 'system.setting',
      role: { roleId: '201' },
      bindingVersion: '0',
      rules: []
    });
    await model.load('system.setting');
    expect(model.rules.value).toEqual([]);
    expect(model.manifest.value?.canActivate).toBe(false);
    scope.stop();
  });
  it('rejects a manifest returned for another tenant', async () => {
    const { model, repo, scope } = setup();
    repo.manifest.mockResolvedValue({ ...context, tenantId: '1' });
    await model.load();
    expect(model.reloadRequired.value).toBe(true);
    expect(model.document.value).toBeNull();
    scope.stop();
  });
  it('rejects incomplete catalog and does not offer edits', async () => {
    const { model, repo, scope } = setup();
    repo.catalog.mockResolvedValue({ ...context, objects: [], complete: false, nextCursor: null });
    await model.load();
    expect(model.editable.value).toBe(false);
    expect(repo.object).not.toHaveBeenCalled();
    scope.stop();
  });
  it('expires preview and supports undo without retaining a preview', async () => {
    vi.useFakeTimers();
    const { model, scope } = setup();
    await model.load();
    const rules: Api.FieldManagement.Rule[] = [
      {
        fieldId: 'name',
        access: { operation: 'read', purpose: 'management.read', use: '' },
        effect: 'deny',
        level: 'plain',
        maskId: null
      }
    ];
    model.setRules(rules);
    expect(model.dirty.value).toBe(true);
    model.undo();
    expect(model.dirty.value).toBe(false);
    await model.preview();
    model.reason.value = 'review';
    vi.advanceTimersByTime(300001);
    expect(model.canPublish.value).toBe(false);
    expect(await model.publish()).toBe(false);
    scope.stop();
    vi.useRealTimers();
  });
  it('seals only a clean server manifest and reloads confirmed writes', async () => {
    const { model, repo, scope } = setup();
    await model.load();
    repo.previewManifest.mockResolvedValue({
      ...context,
      previewDigest: 'signed',
      expiresAt: new Date(Date.now() + 300000).toISOString(),
      items: []
    });
    repo.build.mockResolvedValue({ headVersion: '2' });
    await model.reviewManifest();
    model.reason.value = 'seal';
    expect(await model.buildManifest()).toBe(true);
    expect(repo.build).toHaveBeenCalledTimes(1);
    expect(model.manifestPreview.value).toBeNull();
    scope.stop();
  });
  it('resolves an unknown receipt without replaying the mutation', async () => {
    const { model, repo, scope } = setup();
    await model.load();
    await model.preview();
    model.reason.value = 'save';
    repo.publish.mockRejectedValue(new FieldPolicyError('FIELD_POLICY_UNAVAILABLE', 0));
    await model.publish();
    await model.load();
    expect(repo.catalog).toHaveBeenCalledTimes(1);
    repo.receipt.mockResolvedValue({ headVersion: '2' });
    await model.checkReceipt();
    expect(model.unknownRequest.value).toBe('');
    expect(repo.publish).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it('invalidates preview on edits and clears on identity change', async () => {
    const { model, identity, scope } = setup();
    await model.load();
    await model.preview();
    model.reason.value = 'change';
    expect(model.canPublish.value).toBe(true);
    model.setRules([
      {
        fieldId: 'name',
        access: { operation: 'read', purpose: 'management.read', use: '' },
        effect: 'deny',
        level: 'plain',
        maskId: null
      }
    ]);
    expect(model.previewResult.value).toBeNull();
    identity.value = 'tenant1/actor202';
    expect(model.document.value).toBeNull();
    expect(model.rules.value).toEqual([]);
    scope.stop();
  });
  it('handles stale preview without automatically retrying publication', async () => {
    const { model, repo, scope } = setup();
    await model.load();
    await model.preview();
    model.reason.value = 'change';
    repo.publish.mockRejectedValue(new FieldPolicyError('FIELD_POLICY_PREVIEW_STALE', 409));
    await model.publish();
    expect(model.reloadRequired.value).toBe(true);
    expect(repo.publish).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it('keeps unknown outcome locked until a receipt is found', async () => {
    const { model, repo, scope } = setup();
    await model.load();
    await model.preview();
    model.reason.value = 'change';
    repo.publish.mockRejectedValue(new FieldPolicyError('AUTHORIZATION_COMMIT_UNKNOWN', 503));
    await model.publish();
    const request = model.unknownRequest.value;
    expect(request).toBeTruthy();
    await model.checkReceipt();
    expect(model.unknownRequest.value).toBe(request);
    expect(repo.publish).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it('ignores a response from an earlier role', async () => {
    const { model, repo, role, scope } = setup();
    let resolve!: (value: Api.FieldManagement.Catalog) => void;
    repo.catalog.mockImplementationOnce(
      () =>
        new Promise(done => {
          resolve = done;
        })
    );
    const pending = model.load();
    role.value = 'other';
    resolve({ ...context, objects: [], complete: true, nextCursor: null, actionCatalogDigest: '' });
    await pending;
    expect(model.document.value).toBeNull();
    scope.stop();
  });
});
