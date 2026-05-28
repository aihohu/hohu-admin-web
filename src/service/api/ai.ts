import { request } from '../request';

// ==================== Provider ====================

/** get provider list */
export function fetchGetProviderList(params?: Api.Ai.ProviderSearchParams) {
  return request<Api.Ai.ProviderList>({
    url: '/ai/provider/list',
    method: 'get',
    params
  });
}

/** add provider */
export function fetchSaveProvider(data: Api.Ai.ProviderCreateParams) {
  return request<App.Service.Response<any>>({
    url: '/ai/provider/add',
    method: 'post',
    data
  });
}

/** update provider */
export function fetchUpdateProvider(providerId: string, data: Api.Ai.ProviderUpdateParams) {
  return request<App.Service.Response<any>>({
    url: `/ai/provider/${providerId}`,
    method: 'put',
    data
  });
}

/** delete provider */
export function fetchDeleteProvider(providerId: string) {
  return request({
    url: `/ai/provider/${providerId}`,
    method: 'delete'
  });
}

/** test model connectivity */
export function fetchTestModel(data: {
  providerCode: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  providerId?: string;
}) {
  return request<App.Service.Response<{ response: string }>>({
    url: '/ai/provider/test-model',
    method: 'post',
    data
  });
}

// ==================== Provider Models ====================

/** get models under a provider */
export function fetchGetProviderModels(providerId: string) {
  return request<Api.Ai.AiModel[]>({
    url: `/ai/provider/${providerId}/models`,
    method: 'get'
  });
}

/** add model under a provider */
export function fetchAddProviderModel(providerId: string, data: Api.Ai.AiModelCreateParams) {
  return request<App.Service.Response<any>>({
    url: `/ai/provider/${providerId}/models`,
    method: 'post',
    data
  });
}

/** update model */
export function fetchUpdateProviderModel(providerId: string, modelId: string, data: Api.Ai.AiModelUpdateParams) {
  return request<App.Service.Response<any>>({
    url: `/ai/provider/${providerId}/models/${modelId}`,
    method: 'put',
    data
  });
}

/** delete model */
export function fetchDeleteProviderModel(providerId: string, modelId: string) {
  return request<App.Service.Response<any>>({
    url: `/ai/provider/${providerId}/models/${modelId}`,
    method: 'delete'
  });
}

/** get available models for chat */
export function fetchGetAvailableModels(capability?: string) {
  return request<Api.Ai.AvailableModel[]>({
    url: '/ai/provider/models',
    method: 'get',
    params: capability ? { capability } : undefined
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
