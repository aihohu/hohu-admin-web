import { effectScope, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserFieldPolicy } from '../user-field-policy';
import {
  fetchUserFieldPolicy,
  previewUserFieldPolicy,
  publishUserFieldPolicy,
  transitionUserFieldPolicy
} from '@/service/api/user-field-policy';

vi.mock('@/service/api/user-field-policy', () => ({
  fetchUserFieldPolicy: vi.fn(),
  previewUserFieldPolicy: vi.fn(),
  publishUserFieldPolicy: vi.fn(),
  transitionUserFieldPolicy: vi.fn()
}));

const response = {
  catalogRevision: 'user-fields/1',
  catalogDigest: 'a'.repeat(64),
  fields: [],
  policy: null,
  state: {
    mode: 'legacy' as const,
    epoch: 1,
    catalogDigest: 'a'.repeat(64),
    candidateManifestDigest: null,
    everEnforced: false,
    canActivate: false,
    activationBlockers: ['FIELD_POLICY_ACCEPTANCE_REQUIRED']
  }
};

describe('policy editing session', () => {
  beforeEach(() => vi.clearAllMocks());
  it('ignores a late response when switching roles', async () => {
    let finish!: (value: never) => void;
    vi.mocked(fetchUserFieldPolicy).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    const scope = effectScope();
    const role = ref('201');
    const model = scope.run(() => useUserFieldPolicy(role))!;
    const pending = model.load();
    role.value = '202';
    finish({ data: response, error: null } as never);
    await pending;
    expect(model.document.value).toBeNull();
    expect(model.busy.value).toBe(false);
    scope.stop();
  });
  it('uses the server epoch and manifest, blocks duplicate activation and locks an unknown ACK', async () => {
    const ready = {
      ...response,
      state: { ...response.state, mode: 'ready', epoch: 42, candidateManifestDigest: 'b'.repeat(64), canActivate: true }
    };
    vi.mocked(fetchUserFieldPolicy).mockResolvedValue({ data: ready, error: null } as never);
    let fail!: (error: Error) => void;
    vi.mocked(transitionUserFieldPolicy).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        })
    );
    const scope = effectScope();
    const model = scope.run(() => useUserFieldPolicy(ref('201')))!;
    await model.load();
    model.reason.value = '  approved  ';
    const pending = model.transition('activate');
    await model.transition('activate');
    expect(transitionUserFieldPolicy).toHaveBeenCalledTimes(1);
    expect(transitionUserFieldPolicy).toHaveBeenCalledWith('201', 'activate', {
      expectedEpoch: 42,
      expectedManifestDigest: 'b'.repeat(64),
      reason: 'approved'
    });
    fail(new Error('connection lost after commit'));
    await pending;
    expect(model.reloadRequired.value).toBe(true);
    await model.transition('activate');
    expect(transitionUserFieldPolicy).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it('keeps enforcing state and prevents returning to ready after activation', async () => {
    const state = { ...response.state, mode: 'ready', candidateManifestDigest: 'b'.repeat(64), canActivate: true };
    vi.mocked(fetchUserFieldPolicy).mockResolvedValue({ data: { ...response, state }, error: null } as never);
    vi.mocked(transitionUserFieldPolicy).mockResolvedValue({
      data: { policy: null, state: { ...state, mode: 'enforcing', everEnforced: true, canActivate: false } },
      error: null
    } as never);
    const scope = effectScope();
    const model = scope.run(() => useUserFieldPolicy(ref('201')))!;
    await model.load();
    model.reason.value = 'activate';
    await model.transition('activate');
    expect(model.document.value?.state.mode).toBe('enforcing');
    expect(model.reason.value).toBe('');
    model.reason.value = 'invalid rollback';
    await model.transition('ready');
    expect(transitionUserFieldPolicy).toHaveBeenCalledTimes(1);
    scope.stop();
  });
  it('requires a current preview and a reason, invalidates preview on edits', async () => {
    vi.mocked(fetchUserFieldPolicy).mockResolvedValue({ data: response, error: null } as never);
    vi.mocked(previewUserFieldPolicy).mockResolvedValue({
      data: { expectedVersion: 0, previewKind: 'rule-diff', changes: [], state: response.state },
      error: null
    } as never);
    const scope = effectScope();
    const model = scope.run(() => useUserFieldPolicy(ref('201')))!;
    await model.load();
    await model.publish();
    expect(publishUserFieldPolicy).not.toHaveBeenCalled();
    await model.preview();
    model.reason.value = 'reviewed';
    expect(model.canPublish.value).toBe(true);
    model.rules.value.push({
      fieldId: 'nickname',
      operation: 'read',
      purpose: 'management.read',
      effect: 'allow',
      read: 'plain',
      maskId: null
    });
    expect(model.canPublish.value).toBe(false);
    scope.stop();
  });
  it('locks a failed publication until explicit reload and never retries', async () => {
    vi.mocked(fetchUserFieldPolicy).mockResolvedValue({ data: response, error: null } as never);
    vi.mocked(previewUserFieldPolicy).mockResolvedValue({
      data: { expectedVersion: 0, previewKind: 'rule-diff', changes: [], state: response.state },
      error: null
    } as never);
    vi.mocked(publishUserFieldPolicy).mockResolvedValue({ data: null, error: new Error('conflict') } as never);
    const scope = effectScope();
    const model = scope.run(() => useUserFieldPolicy(ref('201')))!;
    await model.load();
    await model.preview();
    model.reason.value = 'reviewed';
    await model.publish();
    await model.publish();
    expect(publishUserFieldPolicy).toHaveBeenCalledTimes(1);
    expect(model.reloadRequired.value).toBe(true);
    scope.stop();
  });
});
