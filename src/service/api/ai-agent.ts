import { request } from '@/service/request';
import { platformAuditHeaders } from './platform';

/** get admin agent list */
export function fetchAgentAdminList() {
  return request<Api.AiAgent.AdminListItem[]>({
    headers: platformAuditHeaders(),
    url: '/platform/ai/agents',
    method: 'get'
  });
}

/** get admin agent detail */
export function fetchAgentAdminDetail(agentId: string) {
  return request<Api.AiAgent.AdminDetailItem>({
    headers: platformAuditHeaders(),
    url: `/platform/ai/agents/${agentId}`,
    method: 'get'
  });
}

/** update admin agent */
export function fetchUpdateAgentAdmin(
  agentId: string,
  data: Api.AiAgent.AdminUpdateReq,
  audit?: Api.Platform.AuditContext
) {
  return request<Api.AiAgent.AdminDetailItem>({
    headers: {
      ...platformAuditHeaders(audit),
      'X-Platform-Ticket': audit?.ticket.trim() || '',
      'X-Platform-Reason': encodeURIComponent(audit?.reason.trim() || '')
    },
    url: `/platform/ai/agents/${agentId}`,
    method: 'put',
    data
  });
}

/** Get the minimal safe model options used by the Agent editor. */
export function fetchAgentModelOptions() {
  return request<Api.Ai.ModelOption[]>({
    headers: platformAuditHeaders(),
    url: '/platform/ai/agents/model-options',
    method: 'get'
  });
}

/** get role agent binding */
export function fetchRoleAgentBinding(roleId: string) {
  return request<Api.AiAgent.RoleAgentBinding>({
    url: `/ai/role-agent/${roleId}`,
    method: 'get'
  });
}

/** update role agent binding */
export function fetchUpdateRoleAgentBinding(roleId: string, agentIds: string[]) {
  return request<boolean>({
    url: `/ai/role-agent/${roleId}`,
    method: 'put',
    data: { agentIds }
  });
}
