import { effectScope, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useRelationForm } from '../relation-form';

const policy = {
  read: ['role_desc'],
  query: [],
  create: ['role_name'],
  update: ['role_name', 'role_desc'],
  readLevels: {
    role_desc: 'plain',
    role_name: 'plain',
    role_code: 'plain',
    status: 'plain',
    data_scope: 'plain',
    dept_ids: 'plain',
    parent_id: 'plain',
    dept_name: 'plain',
    order_num: 'plain',
    leader: 'plain',
    phone: 'plain',
    email: 'plain'
  },
  specialCreate: [],
  specialUpdate: [],
  canCreate: true,
  complete: {}
};

async function setup(load = vi.fn().mockResolvedValue({ data: { record: { roleDesc: null }, fieldPolicy: policy } })) {
  const visible = ref(true);
  const id = ref('1');
  const scope = effectScope();
  const form = scope.run(() =>
    useRelationForm<{ roleName: string; roleDesc: string | null }>({
      visible,
      mode: () => 'update',
      target: () => id.value,
      defaults: () => ({ roleName: '', roleDesc: '' }),
      load
    })
  )!;
  await nextTick();
  await nextTick();
  return { form, visible, id, scope, load };
}

describe('current relation form session', () => {
  it('does not prefill a writable input with a masked value', async () => {
    const { form, scope } = await setup(
      vi.fn().mockResolvedValue({
        data: { record: { roleDesc: 'masked' }, fieldPolicy: { ...policy, readLevels: { role_desc: 'masked' } } }
      })
    );
    expect(form.model.value).toEqual({});
    expect(form.payload()).toEqual({});
    form.model.value.roleDesc = null;
    expect(form.payload()).toEqual({ roleDesc: null });
    scope.stop();
  });
  it('keeps hidden fields absent and null unchanged until explicitly edited', async () => {
    const { form, scope } = await setup();
    expect(form.model.value).toEqual({ roleDesc: null });
    expect(form.payload()).toEqual({});
    form.model.value.roleName = 'Explicit';
    expect(form.payload()).toEqual({ roleName: 'Explicit' });
    form.model.value.roleDesc = '';
    expect(form.payload()).toEqual({ roleName: 'Explicit', roleDesc: '' });
    scope.stop();
  });
  it('fails closed after load failure', async () => {
    const { form, scope } = await setup(vi.fn().mockResolvedValue({ error: true }));
    expect(form.ready.value).toBe(false);
    expect(form.editable('roleName')).toBe(false);
    expect(form.payload()).toEqual({});
    scope.stop();
  });
  it('ignores late responses and submission results across target switch and close', async () => {
    let resolveFirst!: (value: unknown) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValue({ data: { record: { roleName: 'Second' }, fieldPolicy: policy } });
    const { form, scope, id, visible } = await setup(load);
    const old = form.session();
    id.value = '2';
    expect(form.current(old)).toBe(false);
    await nextTick();
    await nextTick();
    resolveFirst({ data: { record: { roleName: 'First' }, fieldPolicy: policy } });
    await nextTick();
    await nextTick();
    expect(form.model.value.roleName).toBe('Second');
    expect(form.current(old)).toBe(false);
    const opened = form.session();
    visible.value = false;
    await nextTick();
    expect(form.current(opened)).toBe(false);
    expect(form.payload()).toEqual({});
    scope.stop();
  });

  it('invalidates the form when its component scope is disposed', async () => {
    const { form, scope } = await setup();
    const token = form.session();
    scope.stop();
    expect(form.current(token)).toBe(false);
    expect(form.payload()).toEqual({});
  });
});
