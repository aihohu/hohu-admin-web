declare namespace Api {
  /**
   * namespace Ai
   *
   * backend api module: "ai"
   */
  namespace Ai {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'current' | 'size'>;

    /** AI provider */
    type Provider = {
      /** provider id */
      providerId: string;
      /** provider code */
      providerCode: string;
      /** provider name */
      name: string;
      /** api key (masked) */
      apiKey: string;
      /** base url */
      baseUrl: string | null;
      /** is enabled */
      isEnabled: boolean;
      /** extra config */
      config: Record<string, any> | null;
      /** create time */
      createTime: string;
      /** update time */
      updateTime: string;
    };

    /** AI model capability */
    type ModelCapability = 'text' | 'vision' | 'image-gen' | 'video' | 'audio' | 'embedding';

    /** AI model */
    type AiModel = {
      /** model id */
      modelId: string;
      /** provider id */
      providerId: string;
      /** model name */
      name: string;
      /** capabilities */
      capabilities: ModelCapability[];
      /** model-level base url (overrides provider's) */
      baseUrl: string | null;
      /** is enabled */
      isEnabled: boolean;
      /** sort order */
      sortOrder: number;
      /** extra config */
      config: Record<string, any> | null;
      /** create by */
      createBy: string | null;
      /** create time */
      createTime: string;
    };

    /** model create params */
    type AiModelCreateParams = Pick<
      AiModel,
      'name' | 'capabilities' | 'baseUrl' | 'isEnabled' | 'sortOrder' | 'config'
    >;

    /** model update params */
    type AiModelUpdateParams = Partial<AiModelCreateParams>;

    /** available model for chat selection */
    type AvailableModel = {
      modelId: string;
      providerId: string;
      providerCode: string;
      providerName: string;
      model: string;
      capabilities: ModelCapability[];
      baseUrl: string | null;
    };

    /** provider search params */
    type ProviderSearchParams = CommonType.RecordNullable<Pick<Provider, 'name' | 'providerCode'> & CommonSearchParams>;

    /** provider list */
    type ProviderList = Common.PaginatingQueryRecord<Provider>;

    /** provider create params */
    type ProviderCreateParams = Pick<Provider, 'providerCode' | 'name' | 'apiKey' | 'baseUrl' | 'isEnabled' | 'config'>;

    /** provider update params */
    type ProviderUpdateParams = Partial<ProviderCreateParams>;

    /** AI conversation */
    type Conversation = {
      /** conversation id */
      conversationId: string;
      /** title */
      title: string | null;
      /** model name */
      modelName: string | null;
      /** system prompt */
      systemPrompt: string | null;
      /** status: 0=active, 1=archived */
      status: number;
      /** create time */
      createTime: string;
      /** update time */
      updateTime: string;
    };

    /** conversation search params */
    type ConversationSearchParams = CommonType.RecordNullable<
      Pick<Conversation, 'title' | 'status'> & CommonSearchParams
    >;

    /** conversation list */
    type ConversationList = Common.PaginatingQueryRecord<Conversation>;

    /** conversation create params */
    type ConversationCreateParams = Pick<Conversation, 'title'> &
      Partial<Pick<Conversation, 'modelName' | 'systemPrompt'>>;

    /** conversation update params */
    type ConversationUpdateParams = Partial<Pick<Conversation, 'title' | 'modelName' | 'systemPrompt' | 'status'>>;

    /** message part (Vercel AI SDK format) */
    type MessagePart =
      | { type: 'text'; text: string }
      | { type: 'file'; url: string; mediaType: string; filename?: string };

    /** AI message */
    type Message = {
      /** message id */
      messageId: string;
      /** conversation id */
      conversationId: string;
      /** parent message id */
      parentMessageId: string | null;
      /** role: user/assistant/system/tool */
      role: 'user' | 'assistant' | 'system' | 'tool';
      /** message type: text/tool_call/tool_result */
      messageType: string;
      /** content */
      content: string;
      /** structured message parts (images, files, etc.) */
      parts: MessagePart[] | null;
      /** input tokens */
      tokensInput: number | null;
      /** output tokens */
      tokensOutput: number | null;
      /** create time */
      createTime: string;
    };

    /** conversation detail with messages */
    type ConversationDetail = {
      conversation: Conversation;
      messages: Message[];
    };
  }
}
