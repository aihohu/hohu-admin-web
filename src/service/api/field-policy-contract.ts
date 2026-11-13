/** The same management contract serves normal API and local preparation sessions. */
export type PolicyCall = <T>(path: string, data?: object, signal?: AbortSignal) => Promise<T>;

export class FieldPolicyError extends Error {
  constructor(
    public code: string,
    public status = 0
  ) {
    super(code);
  }
}

export function createFieldPolicyRepository(call: PolicyCall) {
  const root = '/system/field-policy';
  const objectPath = (roleId: string, objectId: string) =>
    `${root}/roles/${encodeURIComponent(roleId)}/objects/${encodeURIComponent(objectId)}`;
  return {
    catalog: (cursor = '0', signal?: AbortSignal) =>
      call<Api.FieldManagement.Catalog>(`${root}/catalog?cursor=${encodeURIComponent(cursor)}`, undefined, signal),
    roles: (cursor = '0', signal?: AbortSignal) =>
      call<Api.FieldManagement.RolePage>(`${root}/roles?cursor=${encodeURIComponent(cursor)}`, undefined, signal),
    object: (roleId: string, objectId: string, signal?: AbortSignal) =>
      call<Api.FieldManagement.Document>(objectPath(roleId, objectId), undefined, signal),
    preview: (roleId: string, objectId: string, data: Api.FieldManagement.Draft, signal?: AbortSignal) =>
      call<Api.FieldManagement.Preview>(`${objectPath(roleId, objectId)}/preview`, data, signal),
    publish: (roleId: string, objectId: string, data: Api.FieldManagement.Draft & Api.FieldManagement.Mutation) =>
      call<Api.FieldManagement.Receipt>(`${objectPath(roleId, objectId)}/revisions`, data),
    manifest: (signal?: AbortSignal) =>
      call<Api.FieldManagement.Manifest>(`${root}/manifests/current`, undefined, signal),
    previewManifest: (data: Api.FieldManagement.ManifestDraft) =>
      call<Api.FieldManagement.Preview>(`${root}/manifests/preview`, data),
    build: (data: Api.FieldManagement.ManifestDraft & Api.FieldManagement.Mutation) =>
      call<Api.FieldManagement.Receipt>(`${root}/manifests`, data),
    freeze: (data: {
      expectedVersion: string;
      expectedEpoch: string;
      objectId: string;
      reason: string;
      requestId: string;
    }) => call<Api.FieldManagement.Receipt>(`${root}/freeze`, data),
    receipt: (requestId: string) =>
      call<Api.FieldManagement.Receipt | null>(`${root}/requests/${encodeURIComponent(requestId)}`)
  };
}

export type FieldPolicyRepository = ReturnType<typeof createFieldPolicyRepository>;
