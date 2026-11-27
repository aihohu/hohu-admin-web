import { fieldAllowed, sameDraftValue } from './ordinary-fields';

/** Hints constrain presentation. Every request is authorized again by the server. */
export function controlQuery<T extends object>(query: T, allowed: readonly string[] | undefined): T {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) =>
        ['current', 'size'].includes(key) ||
        (fieldAllowed(allowed, key) && value !== null && value !== undefined && value !== '')
    )
  ) as T;
}

type SettingSnapshot = {
  values: Record<string, string | number | boolean>;
  fieldPolicy?: { update?: string[]; specialUpdate?: string[] };
  secretKeys: string[];
};
/** Setting identifiers are protocol keys, never snake/camel aliases. */
export function settingPatch(form: SettingSnapshot, before: SettingSnapshot['values']) {
  const allowed = new Set([...(form.fieldPolicy?.update ?? []), ...(form.fieldPolicy?.specialUpdate ?? [])]);
  return Object.fromEntries(
    Object.entries(form.values).filter(
      ([key, value]) =>
        allowed.has(key) && !sameDraftValue(value, before[key]) && !(form.secretKeys.includes(key) && value === '')
    )
  );
}

type RoleSnapshot = {
  values: Record<string, string | number | boolean>;
  roleOptionsComplete?: boolean;
  roleOptions?: { label: string; value: string }[];
  fieldPolicy?: { complete?: Record<string, boolean> };
};
export function registrationEditable(form: RoleSnapshot) {
  if (form.roleOptionsComplete !== true || form.fieldPolicy?.complete?.registration_role_id !== true) return false;
  const value = form.values.registration_role_id;
  return (
    value === '' ||
    (typeof value === 'string' &&
      Boolean(form.roleOptions?.some(option => option.value === value && option.label.trim())))
  );
}

export function jobNotification(result: { notificationStatus?: string } | null | undefined) {
  return result?.notificationStatus === 'notified' || result?.notificationStatus === 'unconfirmed'
    ? result.notificationStatus
    : null;
}
