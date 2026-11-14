import { expect, it, vi } from 'vitest';
import { createFieldPolicyRepository } from '../field-policy-contract';

it('preserves bigint IDs, escapes targets, and sends CAS bodies without authority injection', async () => {
  const call = vi.fn().mockResolvedValue({});
  const repo = createFieldPolicyRepository(call);
  const signal = new AbortController().signal;
  await repo.object('9007199254740993', 'system/user', signal);
  expect(call).toHaveBeenLastCalledWith(
    '/system/field-policy/roles/9007199254740993/objects/system%2Fuser',
    undefined,
    signal
  );
  await repo.catalog('100', signal);
  await repo.roles('201', signal);
  await repo.manifest(signal);
  const draft = {
    expectedVersion: '9007199254740993',
    expectedBindingVersion: '0',
    catalogDigest: 'catalog',
    rules: []
  };
  await repo.preview('201', 'system.user', draft, signal);
  const write = { ...draft, requestId: 'request', reason: 'review', previewDigest: 'preview' };
  await repo.publish('201', 'system.user', write);
  expect(call).toHaveBeenLastCalledWith('/system/field-policy/roles/201/objects/system.user/revisions', write);
  await repo.previewManifest(draft);
  await repo.build(write);
  await repo.freeze({
    expectedVersion: '2',
    expectedEpoch: '3',
    objectId: 'system.user',
    reason: 'freeze',
    requestId: 'request'
  });
  await repo.receipt('a/b');
  expect(call).toHaveBeenLastCalledWith('/system/field-policy/requests/a%2Fb');
});
