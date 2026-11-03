import { request } from '../request';

export type PolicyRule = Api.UserFieldPolicy.PolicyRule;
export type PolicyField = Api.UserFieldPolicy.PolicyField;
export type PolicyState = Api.UserFieldPolicy.PolicyState;
export type PolicyDocument = Api.UserFieldPolicy.PolicyDocument;
export type PolicyResponse = Api.UserFieldPolicy.PolicyResponse;
export type PolicyDraft = Api.UserFieldPolicy.PolicyDraft;
export type PolicyPreview = Api.UserFieldPolicy.PolicyPreview;

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
