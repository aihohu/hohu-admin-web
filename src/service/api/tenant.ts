import { request } from '@/service/request';
import { platformAuditHeaders } from './platform';

function auditHeaders(reason: string) {
  return platformAuditHeaders({ reason, ticket: `TENANT-${crypto.randomUUID()}` });
}

export function fetchTenantList(current = 1, size = 20) {
  return request<Api.Tenant.Page>({
    url: '/platform/tenants',
    params: { current, size },
    headers: auditHeaders('Read tenant registry')
  });
}

export function fetchCreateTenant(data: { tenantCode: string; tenantName: string }, key: string) {
  return request<Api.Tenant.Record>({
    url: '/platform/tenants',
    method: 'post',
    data,
    headers: { ...auditHeaders('Create tenant'), 'Idempotency-Key': key }
  });
}

export function fetchBootstrapTenant(
  tenantId: string,
  data: { defaultModelId: string; adminPassword: string },
  key: string
) {
  return request<Api.Tenant.Bootstrap>({
    url: `/platform/tenants/${tenantId}/bootstrap`,
    method: 'post',
    data,
    headers: { ...auditHeaders('Initialize tenant administrator and AI access'), 'Idempotency-Key': key }
  });
}

export function fetchTenantStatus(tenantId: string, action: 'activate' | 'disable') {
  return request<Api.Tenant.Record>({
    url: `/platform/tenants/${tenantId}/${action}`,
    method: 'post',
    headers: auditHeaders(`${action} tenant`)
  });
}

export function fetchTenantPolicies(tenantId: string) {
  return request<Api.Tenant.Policy[]>({
    url: `/platform/tenants/${tenantId}/ai/model-policies`,
    headers: auditHeaders('Read tenant AI authorization')
  });
}

export function fetchSaveTenantPolicy(
  tenantId: string,
  modelId: string,
  data: Pick<Api.Tenant.Policy, 'enabled' | 'isDefault' | 'dailyQuotaPerUser'>
) {
  return request<Api.Tenant.Policy>({
    url: `/platform/tenants/${tenantId}/ai/model-policies/${modelId}`,
    method: 'put',
    data,
    headers: auditHeaders('Update tenant AI authorization')
  });
}
