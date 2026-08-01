import { request } from '@/service/request';

/** get admin agent list */
export function fetchAgentAdminList() {
  return request<Api.AiAgent.AdminListItem[]>({
    url: '/ai/admin/agents',
    method: 'get'
  });
}

/** get admin agent detail */
export function fetchAgentAdminDetail(agentId: string) {
  return request<Api.AiAgent.AdminDetailItem>({
    url: `/ai/admin/agents/${agentId}`,
    method: 'get'
  });
}

/** update admin agent */
export function fetchUpdateAgentAdmin(agentId: string, data: Api.AiAgent.AdminUpdateReq) {
  return request<boolean>({
    url: `/ai/admin/agents/${agentId}`,
    method: 'put',
    data
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
