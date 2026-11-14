import { computed, effectScope, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useControlForm } from '../control-form';

const policy = {
  read: ['remark'],
  query: [],
  create: ['config_name'],
  update: ['config_name', 'remark'],
  specialCreate: [],
  specialUpdate: ['status'],
  canCreate: true,
  readLevels: { remark: 'plain' as const },
  complete: {}
};
const context = {
  record: { remark: null },
  fieldPolicy: policy,
  formReceipt: 'current',
  publicationRevision: 'publish',
  revocationRevision: 'revoke'
};
async function setup(load = vi.fn().mockResolvedValue({ data: structuredClone(context) })) {
  const visible = ref(true);
  const target = ref('1');
  const scope = effectScope();
  const form = scope.run(() =>
    useControlForm<{ configName: string; remark: string | null; status: string }>({
      visible,
      mode: () => 'update',
      target: () => target.value,
      defaults: () => ({ configName: '', remark: null, status: '2' }),
      load
    })
  )!;
  await flushPromises();
  return { visible, target, scope, form, load };
}
describe('control form receipts and sparse drafts', () => {
  it('enables saving when an existing readable value changes', async () => {
    const { form, scope } = await setup();
    const dirty = computed(() => Object.keys(form.payload()).length > 0);
    expect(dirty.value).toBe(false);
    form.model.value.remark = 'Changed readable metadata';
    expect(dirty.value).toBe(true);
    expect(form.payload()).toEqual({ remark: 'Changed readable metadata' });
    scope.stop();
  });
  it('omits untouched blind inputs and special commands from ordinary metadata', async () => {
    const { form, scope } = await setup();
    expect(form.payload()).toEqual({});
    expect(form.replacement('configName')).toBe(true);
    form.model.value.configName = 'Explicit';
    form.model.value.status = '1';
    expect(form.payload()).toEqual({ configName: 'Explicit' });
    expect(form.receipt.value).toBe('current');
    form.model.value.remark = '';
    expect(form.payload()).toEqual({ configName: 'Explicit', remark: '' });
    scope.stop();
  });
  it('fails closed without the server receipt', async () => {
    const { form, scope } = await setup(vi.fn().mockResolvedValue({ data: { ...context, formReceipt: undefined } }));
    expect(form.ready.value).toBe(false);
    expect(form.payload()).toEqual({});
    scope.stop();
  });
  it('invalidates delayed reads, save tokens and proofs on target/close/reopen/dispose', async () => {
    let finish!: (value: unknown) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      )
      .mockResolvedValue({ data: { ...context, formReceipt: 'second', record: { remark: 'second' } } });
    const { form, visible, target, scope } = await setup(load);
    const old = form.session();
    target.value = '2';
    await flushPromises();
    finish({ data: context });
    await flushPromises();
    expect(form.model.value.remark).toBe('second');
    expect(form.receipt.value).toBe('second');
    expect(form.current(old)).toBe(false);
    const second = form.session();
    visible.value = false;
    visible.value = true;
    await flushPromises();
    expect(form.current(second)).toBe(false);
    scope.stop();
    expect(form.ready.value).toBe(false);
    expect(form.receipt.value).toBe('');
  });
});
