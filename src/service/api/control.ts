import { request } from '../request';

export function fetchConfigForm(params: Api.SystemManage.ControlFormQuery) {
  return request<Api.SystemManage.ControlFormContext<Api.SystemManage.ConfigCreateParams>>({
    url: '/system/config/form',
    params
  });
}
export function fetchJobForm(params: Api.SystemManage.ControlFormQuery) {
  return request<Api.SystemManage.ControlFormContext<Api.SystemManage.JobCreateParams>>({
    url: '/system/job/form',
    params
  });
}
export function publishConfig(configId: string, expectedRevision: string) {
  return request<null>({
    url: `/system/config/${configId}/publication`,
    method: 'put',
    data: { confirmed: true, expectedRevision }
  });
}
export function revokeConfigPublication(configId: string, expectedRevision: string) {
  return request<null>({ url: `/system/config/${configId}/publication`, method: 'delete', data: { expectedRevision } });
}
export function updateJobSchedule(data: Api.SystemManage.JobScheduleParams) {
  return request<null>({ url: '/system/job/schedule', method: 'put', data });
}
