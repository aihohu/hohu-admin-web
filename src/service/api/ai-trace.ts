import { request } from '@/service/request';

/** Get the tenant-scoped grouped AI Trace list. */
export function fetchAiTraceList(params: Api.AiTrace.ListQuery) {
  return request<Api.Common.PaginatingQueryRecord<Api.AiTrace.Summary>>({
    url: '/ai/operation-log/traces',
    method: 'get',
    params
  });
}

/** Get one tenant-scoped redacted AI Trace detail. */
export function fetchAiTraceDetail(traceId: string) {
  return request<Api.AiTrace.Detail>({
    url: `/ai/operation-log/traces/${encodeURIComponent(traceId)}`,
    method: 'get'
  });
}
