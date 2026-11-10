/** Capability hints control presentation; the transaction owner rechecks every request. */
export function fieldAllowed(fields: readonly string[] | undefined, key: string): boolean {
  return Boolean(fields?.some(field => field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()) === key));
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
    if (!creating && before && Object.hasOwn(before, key) && Object.is(before[key], model[key])) continue;
    result[key] = model[key];
  }
  return result;
}
