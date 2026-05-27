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
