import { request } from '../request';

export interface PolicyRule {
  fieldId: string;
  operation: string;
  purpose: string;
  effect: 'allow' | 'deny';
  read: 'plain' | 'masked';
  maskId: string | null;
}

export interface PolicyField {
  fieldId: string;
  readable: boolean;
  maskId: string | null;
  options: Array<{ purpose: string; operation: string }>;
}

export interface PolicyState {
  mode: 'legacy' | 'ready' | 'enforcing' | 'frozen';
  epoch: number;
  catalogDigest: string;
  candidateManifestDigest: string | null;
  activeManifestDigest: string | null;
  everEnforced: boolean;
  canActivate: boolean;
  activationBlockers: string[];
}

export interface PolicyDocument {
  roleId: string;
  revisionId: string;
  version: number;
  archived: boolean;
  rulesDigest: string;
  createdAt: string;
  rules: PolicyRule[];
}

export interface PolicyResponse {
  catalogRevision: string;
  catalogDigest: string;
  fields: PolicyField[];
  policy: PolicyDocument | null;
  state: PolicyState;
}

export interface PolicyDraft {
  expectedVersion: number;
  catalogDigest: string;
  rules: PolicyRule[];
}

export interface PolicyPreview {
  effectiveSamples: Array<{
    subjectUserId: string;
    recordUserId: string;
    fieldId: string;
    operation: string;
    purpose: string;
    before: { allowed: boolean; read: string };
    after: { allowed: boolean; read: string };
  }>;
  samplesTruncated: boolean;
  queryCoverageVerified: false;
  expectedVersion: number;
  previewKind: 'rule-diff';
  changes: Array<
    Pick<PolicyRule, 'fieldId' | 'operation' | 'purpose'> & {
      before: Pick<PolicyRule, 'effect' | 'read' | 'maskId'> | null;
      after: Pick<PolicyRule, 'effect' | 'read' | 'maskId'> | null;
    }
  >;
  state: PolicyState;
}

export function fetchUserFieldPolicy(roleId: string) {
  return request<PolicyResponse>({ url: `/system/user-field-policy/${roleId}`, method: 'get' });
}

export function previewUserFieldPolicy(roleId: string, data: PolicyDraft) {
  return request<PolicyPreview>({ url: `/system/user-field-policy/${roleId}/preview`, method: 'post', data });
}

export function publishUserFieldPolicy(roleId: string, data: PolicyDraft & { reason: string }) {
  return request<Pick<PolicyResponse, 'policy' | 'state'>>({
    url: `/system/user-field-policy/${roleId}/publish`,
    method: 'post',
    data
  });
}

export function transitionUserFieldPolicy(
  roleId: string,
  action: 'ready' | 'activate' | 'freeze',
  data: {
    expectedEpoch: number;
    expectedManifestDigest: string;
    reason: string;
  }
) {
  return request<Pick<PolicyResponse, 'policy' | 'state'>>({
    url: `/system/user-field-policy/${roleId}/${action}`,
    method: 'post',
    data
  });
}
