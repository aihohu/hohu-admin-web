import { describe, expect, it } from 'vitest';
import { controlQuery, settingPatch, registrationEditable, jobNotification } from '../control-fields';

describe('control presentation boundaries', () => {
  it('sends only queryable nonempty conditions, retaining paging and legitimate zero', () => {
    expect(
      controlQuery({ current: 2, size: 10, configName: 'stale', configKey: 'visible', status: null }, ['config_key'])
    ).toEqual({ current: 2, size: 10, configKey: 'visible' });
    expect(controlQuery({ current: 1, size: 10, jobName: 'hidden' }, [])).toEqual({ current: 1, size: 10 });
  });
  it('keeps stable setting keys exact and submits only allowed dirty replacements', () => {
    const form = {
      values: {
        default_avatar: 'new',
        defaultAvatar: 'wrong',
        'upload:max_bytes': 0,
        'auth:default_password': '',
        readonly: 'changed',
        toggle: false
      },
      fieldPolicy: {
        update: ['default_avatar', 'toggle'],
        specialUpdate: ['upload:max_bytes', 'auth:default_password']
      },
      secretKeys: ['auth:default_password']
    };
    expect(settingPatch(form, { default_avatar: 'old', 'upload:max_bytes': 1, toggle: true })).toEqual({
      default_avatar: 'new',
      'upload:max_bytes': 0,
      toggle: false
    });
    form.values['auth:default_password'] = 'Explicit replacement';
    expect(settingPatch(form, form.values)).toEqual({});
    expect(settingPatch(form, { ...form.values, 'auth:default_password': '' })).toEqual({
      'auth:default_password': 'Explicit replacement'
    });
  });
  it('closes an incomplete registration selector without ID label fallbacks', () => {
    const form = {
      roleOptionsComplete: false,
      fieldPolicy: { complete: { registration_role_id: true } },
      values: { registration_role_id: '12' },
      roleOptions: [{ label: 'Role', value: '12' }]
    };
    expect(registrationEditable(form)).toBe(false);
    form.roleOptionsComplete = true;
    expect(registrationEditable(form)).toBe(true);
    form.values.registration_role_id = '13';
    expect(registrationEditable(form)).toBe(false);
  });
  it('does not describe a subscriber notification as execution or retry unknown delivery', () => {
    expect(jobNotification({ notificationStatus: 'notified' })).toBe('notified');
    expect(jobNotification({ notificationStatus: 'unconfirmed' })).toBe('unconfirmed');
    expect(jobNotification(null)).toBe(null);
  });
});
