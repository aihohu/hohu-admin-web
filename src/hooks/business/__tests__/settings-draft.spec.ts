import { effectScope } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSettingsDraft } from '../settings-draft';
import type { SettingGroup } from '@/service/api/settings';
const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('@/service/api/settings', () => ({ fetchSettingGroup: api.load, saveSettingGroup: api.save }));
function snapshot(group = 'brand'): SettingGroup {
  return {
    group,
    values: {
      site_name: 'Before',
      site_description: 'Read only',
      'auth:default_password': '',
      registration_role_id: '12'
    },
    revision: 'revision',
    formReceipt: 'receipt-' + group,
    fields: [
      { key: 'site_name', kind: 'text', minimum: null, maximum: null, options: [] },
      { key: 'site_description', kind: 'text', minimum: null, maximum: null, options: [] }
    ],
    secretKeys: ['auth:default_password'],
    configuredSecrets: ['auth:default_password'],
    roleOptionsComplete: false,
    fieldPolicy: {
      read: ['site_description'],
      query: [],
      create: [],
      update: ['site_name'],
      specialCreate: [],
      specialUpdate: ['auth:default_password', 'registration_role_id'],
      readLevels: { site_description: 'plain' },
      canCreate: false,
      complete: { registration_role_id: false }
    }
  };
}
function setup() {
  const scope = effectScope();
  const state = scope.run(useSettingsDraft)!;
  return { state, scope };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.load.mockImplementation(async (name: string) => ({ data: snapshot(name), error: null }));
});
describe('current settings group drafts', () => {
  it('requires an explicit fresh load after a save conflict or failed reload', async () => {
    const { state, scope } = setup();
    await state.load();
    state.form.value!.values.site_name = 'Retain for review';
    api.save.mockResolvedValueOnce({ data: null, error: new Error('SETTINGS_CONFLICT') });
    expect(await state.save()).toBe(false);
    expect(state.canSave.value).toBe(false);
    expect(await state.save()).toBe(false);
    expect(api.save).toHaveBeenCalledOnce();
    api.load.mockRejectedValueOnce(new Error('offline'));
    await state.load('brand', true);
    expect(state.canSave.value).toBe(false);
    scope.stop();
  });
  it('submits dirty exact keys with the current proof and retains hidden secrets and incomplete relations', async () => {
    const { state, scope } = setup();
    await state.load();
    expect(state.patch()).toEqual({});
    expect(state.editable('siteName')).toBe(false);
    state.form.value!.values.site_name = 'Replacement';
    state.form.value!.values.site_description = 'Cannot write';
    state.form.value!.values.registration_role_id = '';
    api.save.mockResolvedValue({ data: snapshot(), error: null });
    expect(await state.save()).toBe(true);
    expect(api.save).toHaveBeenCalledWith('brand', {
      values: { site_name: 'Replacement' },
      revision: 'revision',
      formReceipt: 'receipt-brand'
    });
    expect(state.dirty.value).toBe(false);
    scope.stop();
  });
  it('never resends unchanged or empty secrets, while an explicit nonempty replacement is dirty', async () => {
    const { state, scope } = setup();
    await state.load();
    expect(await state.save()).toBe(false);
    expect(api.save).not.toHaveBeenCalled();
    state.form.value!.values['auth:default_password'] = 'Explicit';
    expect(state.patch()).toEqual({ 'auth:default_password': 'Explicit' });
    state.form.value!.values['auth:default_password'] = '';
    expect(state.patch()).toEqual({});
    scope.stop();
  });
  it('rejects late group reads and old save completions across navigation and disposal', async () => {
    let finishRead!: (value: unknown) => void;
    let finishSave!: (value: unknown) => void;
    const { state, scope } = setup();
    api.load.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishRead = resolve;
        })
    );
    const first = state.load('brand');
    await state.load('account');
    finishRead({ data: snapshot(), error: null });
    await first;
    expect(state.active.value).toBe('account');
    expect(state.drafts.value.brand).toBeUndefined();
    state.form.value!.values.site_name = 'Account draft';
    api.save.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishSave = resolve;
        })
    );
    const save = state.save();
    await state.load('brand');
    state.form.value!.values.site_name = 'New target';
    finishSave({ data: snapshot('account'), error: null });
    expect(await save).toBe(false);
    expect(state.form.value!.values.site_name).toBe('New target');
    const token = state.session();
    scope.stop();
    expect(state.current(token)).toBe(false);
  });
  it('closes saving without receipt or an eligible field, including failed loads', async () => {
    const { state, scope } = setup();
    api.load.mockResolvedValueOnce({ data: { ...snapshot(), formReceipt: undefined }, error: null });
    await state.load();
    expect(state.canSave.value).toBe(false);
    api.load.mockRejectedValueOnce(new Error('offline'));
    await state.load('files');
    expect(state.failed.value).toBe(true);
    expect(await state.save()).toBe(false);
    scope.stop();
  });
});
