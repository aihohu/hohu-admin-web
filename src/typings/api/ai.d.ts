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
      | { type: 'file'; url: string; mediaType: string; filename?: string; fileSize?: number };

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
        /** v1.6+ SR-13: readonly tool chip 跳转目标（声明式），reload 后还原卡片 chip */
        chip_target?: string | null;
        ok?: boolean;
        result?: unknown;
        affected_rows?: number | null;
        error_code?: string;
        error_msg?: string;
        duration_ms?: number;
        /** v1.6+ SR-13: UI 层结果，重连后按 viewType 路由标准组件（缺失则 fallback PlainJsonView） */
        ui?: UIResult;
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

    /** spec 2026-07-16 §2.3: 5 种标准 view_type */
    type ViewType = 'rows_affected' | 'data_list' | 'stats_chart' | 'detail_card' | 'plain_json';

    /** rows_affected view_data schema */
    type RowsAffectedViewData = {
      count: number;
      ids?: string[];
    };

    /** data_list view_data schema */
    type DataListViewData = {
      columns: Array<{ key: string; label: string }>;
      rows: Array<Record<string, unknown>>;
    };

    /** stats_chart view_data schema */
    type StatsChartViewData = {
      rows: Array<{ group: string; count: number }>;
    };

    /** detail_card view_data schema */
    type DetailCardViewData = {
      title: string;
      fields: Array<{ label: string; value: string }>;
      /**
       * Task 33 / spec §2.31 line 1626：可选下载链接（相对 baseURL 的 API 路径，
       * 例如 `/system/user/export/{export_id}/download`）。设置后 DetailCardView
       * 在 fields 下方渲染「下载」按钮，点击调 fetchDownloadFile 走 Authorization
       * 下载 blob 触发浏览器保存。
       */
      downloadUrl?: string;
      /** 下载文件名（决策 30.6 规范：hohu_xxx_YYYYMMDD_HHmmss.xlsx） */
      downloadFilename?: string;
    };

    /** plain_json view_data schema（自由 dict） */
    type PlainJsonViewData = Record<string, unknown>;

    /** UIResult（spec §2.2）— 前端按 viewType 路由标准组件 */
    type UIResult = {
      viewType: ViewType;
      viewData: RowsAffectedViewData | DataListViewData | StatsChartViewData | DetailCardViewData | PlainJsonViewData;
      audit?: Record<string, unknown>;
      labelKey?: string;
      labelParams?: Record<string, unknown>;
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
      /** v1.6+ SR-13: chip 跳转目标（声明式，替代前端 CHIP_TARGETS map） */
      chipTarget?: string | null;
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
      /** v1.6+ SR-13: UI 层结果，前端按 ui.viewType 路由标准组件 */
      ui?: UIResult;
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

    /** spec §6.2 v4: clarification_required 事件（无状态，前端弹候选 Agent 卡片重发） */
    type ClarificationCandidate = {
      code: string;
      name: string;
      description: string;
    };

    type ClarificationRequiredEvent = {
      type: 'clarification_required';
      candidates: ClarificationCandidate[];
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
      | ClarificationRequiredEvent
      | AiErrorEvent
      | DoneEvent;

    /** spec §6.4: routing feedback request (POST /ai/messages/{id}/routing-feedback) */
    type RoutingFeedbackRequest = {
      /** 'correct' | 'wrong' */
      feedback: 'correct' | 'wrong';
      /** feedback='wrong' 时必填，用户选择的正确 Agent code */
      correctedAgentCode?: string;
    };

    /** spec §6.4: routing feedback response */
    type RoutingFeedbackResponse = {
      feedbackId: string;
    };

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
