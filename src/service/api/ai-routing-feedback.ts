import { request } from '@/service/request';

/** get routing feedback summary */
export function fetchRoutingFeedbackSummary(days: number) {
  return request<Api.AiRoutingFeedback.Summary>({
    url: '/ai/routing-feedback/summary',
    method: 'get',
    params: { days }
  });
}

/** get routing feedback paged list */
export function fetchRoutingFeedbackList(params: Api.AiRoutingFeedback.ListQuery) {
  return request<{
    records: Api.AiRoutingFeedback.ListItem[];
    total: number;
    current: number;
    size: number;
  }>({
    url: '/ai/routing-feedback/list',
    method: 'get',
    params
  });
}
