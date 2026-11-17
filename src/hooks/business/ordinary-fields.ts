/** Capability hints control presentation; the transaction owner rechecks every request. */
export function fieldAllowed(fields: readonly string[] | undefined, key: string): boolean {
  return Boolean(fields?.some(field => field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) === key));
}

/** JSON form snapshots may be cloned; object identity is not an edit. */
export function sameDraftValue(left: unknown, right: unknown, depth = 0): boolean {
  if (Object.is(left, right)) return true;
  if (depth >= 64) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameDraftValue(value, right[index], depth + 1))
    );
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (
    ![Object.prototype, null].includes(Object.getPrototypeOf(left)) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(right))
  )
    return false;
  const keys = Object.keys(left);
  const before = left as Record<string, unknown>;
  const after = right as Record<string, unknown>;
  return (
    keys.length === Object.keys(right).length &&
    keys.every(key => Object.hasOwn(right, key) && sameDraftValue(before[key], after[key], depth + 1))
  );
}

export function editablePayload<T extends object>(
  model: T,
  before: Partial<Record<keyof T, unknown>> | null | undefined,
  allowed: readonly string[] | undefined,
  creating: boolean,
  touched?: ReadonlySet<string>
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(model) as (keyof T & string)[]) {
    if (!fieldAllowed(allowed, key)) continue;
    if (!creating && touched && !touched.has(key)) continue;
    if (!creating && !touched && (!before || !Object.hasOwn(before, key))) continue;
    if (!creating && before && Object.hasOwn(before, key) && sameDraftValue(before[key], model[key])) continue;
    result[key] = model[key];
  }
  return result;
}
