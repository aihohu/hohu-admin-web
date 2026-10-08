import { request } from '../request';
import { platformAuditHeaders } from './platform';

function providerAuditHeaders(reason: string) {
  return platformAuditHeaders({ reason, ticket: `MODEL-${crypto.randomUUID()}` });
}

/** Read a chat image with live tenant, owner and AI permission checks. */
export function fetchChatImage(fileUrl: string) {
  return request<Blob, 'blob'>({
    url: '/system/file/chat-image',
    method: 'get',
    params: { fileUrl },
    responseType: 'blob'
  });
}

/** Download the currently authorized AI result; callers must reject JSON errors. */
export function fetchAiResultFile(url: string) {
  return request<Blob, 'blob'>({ url, method: 'get', responseType: 'blob' });
}

// ==================== Provider ====================

/** get provider list */
export function fetchGetProviderList(params?: Api.Ai.ProviderSearchParams) {
  return request<Api.Ai.ProviderList>({
    url: '/platform/ai/providers',
    headers: providerAuditHeaders('Read model providers'),
    method: 'get',
    params
  });
}

/** add provider */
export function fetchSaveProvider(data: Api.Ai.ProviderCreateParams) {
  return request<Api.Ai.Provider>({
    url: '/platform/ai/providers',
    headers: providerAuditHeaders('Create model provider'),
    method: 'post',
    data
  });
}

/** update provider */
export function fetchUpdateProvider(providerId: string, data: Api.Ai.ProviderUpdateParams) {
  return request<Api.Ai.Provider>({
    url: `/platform/ai/providers/${providerId}`,
    headers: providerAuditHeaders('Update model provider'),
    method: 'put',
    data
  });
}

/** delete provider */
export function fetchDeleteProvider(providerId: string) {
  return request({
    url: `/platform/ai/providers/${providerId}`,
    headers: providerAuditHeaders('Delete model provider'),
    method: 'delete'
  });
}

/** Test the current Provider and model form without saving either configuration. */
export function fetchTestProviderModel(data: Api.Ai.ProviderModelTestRequest) {
  return request<Api.Ai.ProviderModelTestResult>({
    url: '/platform/ai/providers/test',
    headers: providerAuditHeaders('Test provider model form'),
    method: 'post',
    data
  });
}

// ==================== Provider Models ====================

/** get models under a provider */
export function fetchGetProviderModels(providerId: string) {
  return request<Api.Ai.AiModel[]>({
    url: `/platform/ai/providers/${providerId}/models`,
    headers: providerAuditHeaders('Read provider models'),
    method: 'get'
  });
}

/** add model under a provider */
export function fetchAddProviderModel(providerId: string, data: Api.Ai.AiModelCreateParams) {
  return request<Api.Ai.AiModel>({
    url: `/platform/ai/providers/${providerId}/models`,
    headers: providerAuditHeaders('Create provider model'),
    method: 'post',
    data
  });
}

/** update model */
export function fetchUpdateProviderModel(providerId: string, modelId: string, data: Api.Ai.AiModelUpdateParams) {
  return request<Api.Ai.AiModel>({
    url: `/platform/ai/providers/${providerId}/models/${modelId}`,
    headers: providerAuditHeaders('Update provider model'),
    method: 'put',
    data
  });
}

/** delete model */
export function fetchDeleteProviderModel(providerId: string, modelId: string) {
  return request({
    url: `/platform/ai/providers/${providerId}/models/${modelId}`,
    headers: providerAuditHeaders('Delete provider model'),
    method: 'delete'
  });
}

/** Get the management catalog visible from the Provider page only. */
export function fetchGetProviderModelCatalog(capability?: string) {
  return request<Api.Ai.ProviderModelCatalogItem[]>({
    url: '/platform/ai/providers/models',
    headers: providerAuditHeaders('Read model catalog'),
    method: 'get',
    params: capability ? { capability } : undefined
  });
}

/** Get the minimal chat-safe model options for the current user. */
export function fetchGetChatModels() {
  return request<Api.Ai.ModelOption[]>({
    url: '/ai/chat/models',
    method: 'get'
  });
}

// ==================== Conversation ====================

/** get conversation list */
export function fetchGetConversationList(params?: Api.Ai.ConversationSearchParams) {
  return request<Api.Ai.ConversationList>({
    url: '/ai/conversation/list',
    method: 'get',
    params
  });
}

/** get conversation detail with messages */
export function fetchGetConversationDetail(conversationId: string) {
  return request<Api.Ai.ConversationDetail>({
    url: `/ai/conversation/${conversationId}`,
    method: 'get'
  });
}

/** create conversation */
export function fetchSaveConversation(data: Api.Ai.ConversationCreateParams) {
  return request<Api.Ai.Conversation>({
    url: '/ai/conversation',
    method: 'post',
    data
  });
}

/** update conversation */
export function fetchUpdateConversation(conversationId: string, data: Api.Ai.ConversationUpdateParams) {
  return request<App.Service.Response<any>>({
    url: `/ai/conversation/${conversationId}`,
    method: 'put',
    data
  });
}

/** delete conversation */
export function fetchDeleteConversation(conversationId: string) {
  return request({
    url: `/ai/conversation/${conversationId}`,
    method: 'delete'
  });
}

// ==================== Human confirmation ====================

/** POST /ai/confirm — 用户点确认 / 取消 */
export function fetchAiConfirm(data: Api.Ai.ConfirmRequest) {
  return request<Api.Ai.ConfirmResponse>({
    url: '/ai/confirm',
    method: 'post',
    data
  });
}

// ==================== Confirmation operation status ====================

/** GET /ai/operation-log?tool_call_id=... — confirm 后 30s 轮询兜底取结果 */
export function fetchAiOperationLog(toolCallId: string) {
  return request<Api.Ai.OperationLog>({
    url: '/ai/operation-log',
    method: 'get',
    params: { tool_call_id: toolCallId }
  });
}

// ==================== Tool query replay cache ====================

/** GET /ai/query-cache/<trace_id> — 模块页 mounted 时反查回放筛选 */
export function fetchAiQueryCache(traceId: string, toolName?: string) {
  return request<Api.Ai.QueryCache | null>({
    url: `/ai/query-cache/${traceId}`,
    method: 'get',
    params: toolName ? { tool_name: toolName } : undefined
  });
}

// ==================== Available chat Agents ====================

/** GET /ai/agents — 列当前用户可用的 Agent（超管全开 / 普通用户走 role_ai_agent + shared 直通） */
export function fetchAiAgents() {
  return request<Api.Ai.Agent[]>({
    url: '/ai/agents',
    method: 'get'
  });
}

// ==================== Agent routing feedback ====================

/** POST /ai/messages/{messageId}/routing-feedback — 用户对路由结果做反馈 */
export function fetchRoutingFeedback(messageId: string, data: Api.Ai.RoutingFeedbackRequest) {
  return request<Api.Ai.RoutingFeedbackResponse>({
    url: `/ai/messages/${messageId}/routing-feedback`,
    method: 'post',
    data
  });
}
