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

    /** file attached to a chat message (Excel/CSV for file.parse tool, spec §16 SR-25) */
    type AttachedFile = {
      fileId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
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
      /** tool call events (BUG-FE-18: assistant msg 关联的 tool 调用，重连会话时还原卡片) */
      toolCalls?: Array<{
        tool: string;
        tool_call_id: string;
        summary?: string;
        args?: Record<string, unknown>;
        risk?: 'low' | 'high' | 'destructive';
        trace_id?: string;
        ok?: boolean;
        result?: unknown;
        affected_rows?: number | null;
        error_code?: string;
        error_msg?: string;
        duration_ms?: number;
      }> | null;
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

    // ============ HITL + Stream Events（spec §8.1） ============

    /** dry_run 影响范围（HITL 抽屉展示） */
    type DryRunSummary = {
      summary: string;
      affectedCount: number;
      affectedExamples?: string[];
    };

    /** spec §8.1: tool_call_started 事件 */
    type ToolCallStartedEvent = {
      type: 'tool_call_started';
      tool: string;
      toolCallId: string;
      summary: string;
      args: Record<string, any>;
      /** §5.3 风险分级（卡片色条 + chip 标签） */
      risk: 'low' | 'high' | 'destructive';
      /** §8.7 chip 跳转用 trace_id */
      traceId: string;
    };

    /** spec §8.1: tool_call_result 事件 */
    type ToolCallResultEvent = {
      type: 'tool_call_result';
      tool: string;
      toolCallId: string;
      ok: boolean;
      /** 墙钟耗时（毫秒），含 HITL 等待时间；前端展示「已执行 · 230ms」 */
      durationMs: number;
      result?: any;
      /** 影响行数推断值（dry_run_count 优先；readonly 推断；None 表示隐藏） */
      affectedRows?: number | null;
      errorCode?: string;
      errorMsg?: string;
    };

    /** spec §8.1: confirmation_required 事件（前端弹 HITL 抽屉） */
    type ConfirmationRequiredEvent = {
      type: 'confirmation_required';
      confirmationId: string;
      tool: string;
      toolCallId: string;
      summary: string;
      args: Record<string, any>;
      expiresAt: string; // ISO 8601 UTC
      dryRun?: DryRunSummary;
    };

    /** spec §8.3: confirmation_resumed 事件（HITL 续传恢复确认窗口） */
    type ConfirmationResumedEvent = {
      type: 'confirmation_resumed';
      confirmationId: string;
      tool: string;
      toolCallId: string;
      summary: string;
      args: Record<string, any>;
      expiresAt: string; // ISO 8601 UTC
      dryRun?: DryRunSummary;
      resumedAt: string;
    };

    /** spec §8.1: ai_error 事件（流级错误） */
    type AiErrorEvent = {
      type: 'ai_error';
      errorCode: string;
      message: string;
    };

    /** spec §8.1: done 事件（流结束） */
    type DoneEvent = {
      type: 'done';
    };

    /** 所有自定义 SSE 事件联合（Vercel 原生 text-delta 不在此列） */
    type AiStreamEvent =
      | ToolCallStartedEvent
      | ToolCallResultEvent
      | ConfirmationRequiredEvent
      | ConfirmationResumedEvent
      | AiErrorEvent
      | DoneEvent;

    /** /ai/confirm 请求 */
    type ConfirmRequest = {
      confirmationId: string;
      action: 'approved' | 'rejected';
    };

    /** /ai/confirm 响应 data */
    type ConfirmResponse = {
      toolCallId: string;
      status: 'queued';
    };

    /** /ai/operation-log?tool_call_id=... 响应（spec §9.3 SSE 断流兜底轮询） */
    type OperationLog = {
      toolCallId: string;
      toolName: string;
      status: 'running' | 'pending_confirmation' | 'success' | 'failed' | 'rejected' | 'expired';
      errorCode: string | null;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
    };

    /** /ai/query-cache/<trace_id> 响应（spec §8.7 chip 跳转回放） */
    type QueryCache = {
      toolName: string;
      module: string;
      filters: Record<string, any>;
      createdAt: string;
    };

    /** /ai/agents 响应（v1.5+ UI 切换器） */
    type Agent = {
      code: string;
      name: string;
      description: string;
      modelPreference: string | null;
      displayOrder: number;
    };
  }
}
