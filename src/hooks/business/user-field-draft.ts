/** Current response hints only; the server remains the authorization boundary. */
type Source = Record<string, unknown>;
type Capability = 'create' | 'update' | 'replace';

function accessFor(source: Source, field: string): { read: 'plain' | 'masked' | 'hidden'; access: object } | null {
  const metadata = source.fieldAccess;
  if (!metadata || typeof metadata !== 'object' || !Object.hasOwn(metadata, field)) return null;
  const access: unknown = Reflect.get(metadata, field);
  if (!access || typeof access !== 'object') return null;
  const read: unknown = Reflect.get(access, 'read');
  if (read !== 'plain' && read !== 'masked' && read !== 'hidden') return null;
  return { read, access };
}

export function fieldRead(source: Source, field: string): 'plain' | 'masked' | 'hidden' {
  if (!Object.hasOwn(source, 'fieldAccess')) return Object.hasOwn(source, field) ? 'plain' : 'hidden';
  return accessFor(source, field)?.read ?? 'hidden';
}

export function fieldCapability(source: Source, field: string, capability: Capability): boolean {
  if (!Object.hasOwn(source, 'fieldAccess')) return Object.hasOwn(source, field);
  const entry = accessFor(source, field);
  return entry !== null && Reflect.get(entry.access, capability) === true;
}

export function createUserDraft(source: Source, fields: readonly string[]): Source {
  const draft: Source = {};
  for (const field of fields) {
    if (fieldRead(source, field) === 'plain' && Object.hasOwn(source, field)) draft[field] = source[field];
    else if (fieldCapability(source, field, 'update')) draft[field] = '';
  }
  return draft;
}

export function buildUserPatch(source: Source, draft: Source, fields: readonly string[]): Source {
  const initial = createUserDraft(source, fields);
  return Object.fromEntries(
    fields
      .filter(
        field =>
          Object.hasOwn(draft, field) &&
          draft[field] !== undefined &&
          fieldCapability(source, field, 'update') &&
          !Object.is(initial[field], draft[field])
      )
      .map(field => [field, draft[field]])
  );
}

export function completeRelation(source: Source, field: string, resolved: readonly string[]): boolean {
  const original = source[field];
  return (
    fieldRead(source, field) === 'plain' &&
    fieldCapability(source, field, 'replace') &&
    Array.isArray(original) &&
    original.every(value => typeof value === 'string' && resolved.includes(value))
  );
}

export const userProfileFields = ['userName', 'nickname', 'userGender', 'userPhone', 'userEmail', 'status'] as const;
