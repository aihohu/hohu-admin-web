declare namespace Api {
  namespace FieldManagement {
    type Access = { operation: string; purpose: string; use: string };
    type Rule = {
      fieldId: string;
      access: Access;
      effect: 'allow' | 'deny';
      level: 'plain' | 'masked';
      maskId: string | null;
    };
    type ChoiceValue = 'unset' | 'deny' | 'allow' | 'plain' | 'masked';
    type Choice = { access: Access; values: ChoiceValue[]; safeRecommendation: boolean };
    type Field = {
      fieldId: string;
      valueType: string;
      maskId: string | null;
      readCap: string;
      structural: boolean;
      bulkEligible: boolean;
      sources: { objectId: string; fieldId: string }[];
      choices: Choice[];
    };
    type Object = { objectId: string; domainKind: string; scopeAdapter: string; fields: Field[] };
    type Capabilities = { view: boolean; edit: boolean; activate: boolean; freeze: boolean };
    type Context = {
      catalogDigest: string;
      headVersion: string;
      epoch: string;
      tenantId: string;
      activeManifestDigest: string | null;
      candidateManifestDigest: string | null;
      capabilities: Capabilities;
    };
    type Catalog = Context & {
      objects: Object[];
      nextCursor: string | null;
      actionCatalogDigest: string;
      complete: boolean;
    };
    type Role = { roleId: string; roleName: string; roleCode: string; dataScope: string; status: string };
    type Document = Context & {
      role: Role;
      objectId: string;
      bindingVersion: string;
      revisionId: string | null;
      rules: Rule[];
    };
    type ManifestItem = { roleId: string; objectId: string; revisionId: string; rulesDigest: string };
    type Manifest = Context & {
      objects: { objectId: string; mode: string }[];
      items: ManifestItem[];
      canActivate: boolean;
      activationBlockers: string[];
      rolloutState: string;
    };
    type Draft = { catalogDigest: string; expectedVersion: string; expectedBindingVersion: string; rules: Rule[] };
    type ManifestDraft = { catalogDigest: string; expectedVersion: string };
    type Mutation = { previewDigest: string; reason: string; requestId: string };
    type Preview = Context & {
      previewDigest: string;
      expiresAt: string;
      diff: { fieldId: string; access: Access; before: Rule | null; after: Rule | null }[];
      changeCount: number;
      sampleTruncated: boolean;
      safeSamples: never[];
      items: ManifestItem[];
    };
    type Receipt = {
      headVersion: string;
      epoch: string;
      revisionId?: string;
      candidateManifestDigest: string | null;
      activeManifestDigest: string | null;
    };
    type RolePage = Context & { records: Role[]; nextCursor: string | null };
  }
}
