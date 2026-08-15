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
      config: Record<string, unknown> | null;
      /** create time */
      createTime: string;
      /** update time */
      updateTime: string;
      /** Runtime egress quarantine status. */
      egressStatus: 'EGRESS_POLICY_BLOCKED' | null;
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
      config: Record<string, unknown> | null;
      /** create by */
      createBy: string | null;
      /** create time */
      createTime: string;
      /** Runtime egress quarantine status. */
      egressStatus: 'EGRESS_POLICY_BLOCKED' | null;
    };

    /** model create params */
    type AiModelCreateParams = Pick<
      AiModel,
      'name' | 'capabilities' | 'baseUrl' | 'isEnabled' | 'sortOrder' | 'config'
    >;

    /** model update params */
    type AiModelUpdateParams = Partial<AiModelCreateParams>;

    /** Minimal safe option shared by chat and Agent administration. */
    type ModelOption = {
      modelId: string;
      label: string;
      providerCode: string;
      capabilities: ModelCapability[];
    };

    /** Provider-only model management projection. */
    type ProviderModelCatalogItem = {
      modelId: string;
      providerId: string;
      providerCode: string;
      providerName: string;
      model: string;
      capabilities: ModelCapability[];
      baseUrl: string | null;
      egressStatus: 'EGRESS_POLICY_BLOCKED' | null;
    };

    type ProviderModelTestResult = {
      providerId: string;
      modelId: string;
      status: 'ok';
    };

    /** spreadsheet or CSV file attached to a chat message for server-side parsing */
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
      content: string | null;
      /** structured message parts (images, files, etc.) */
      parts: MessagePart[] | null;
      /** persisted tool calls used to restore cards after reopening a conversation */
      toolCalls?: Array<{
        tool: string;
        tool_call_id: string;
        summary?: string;
        args?: Record<string, unknown>;
        risk?: 'low' | 'high' | 'destructive';
        trace_id?: string;
        /** declarative navigation target restored with the persisted tool card */
        chip_target?: string | null;
        ok?: boolean;
        result?: unknown;
        affected_rows?: number | null;
        error_code?: string;
        error_msg?: string;
        duration_ms?: number;
        /** structured UI result; missing values fall back to the plain JSON view */
        ui?: UIResult;
      }> | null;
      /** ChatCommand run reconciliation key */
      traceId?: string | null;
      /** active history projection */
      isActive?: boolean;
      /** revision lineage; current send path is null */
      supersedesMessageId?: string | null;
      /** input tokens */
      tokensInput: number | null;
      /** output tokens */
      tokensOutput: number | null;
      /** create time */
      createTime: string;
    };

    /** Fail-closed placeholder returned when a historic result is no longer visible. */
    type MessageTombstone = {
      messageId: string;
      role: 'assistant' | 'system' | 'tool';
      status: 'redacted';
      errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN';
    };

    type MessageProjection = Message | MessageTombstone;

    /** conversation detail with messages */
    type ConversationDetail = {
      conversation: Conversation;
      messages: MessageProjection[];
      pendingActions: PendingActionProjection[];
    };

    // ============ Human confirmation and stream events ============

    /** dry_run 影响范围（HITL 抽屉展示） */
    type DryRunSummary = {
      summary: string;
      affectedCount: number;
      summaryKey?: App.I18n.I18nKey;
      summaryParams?: Record<string, string | number>;
      affectedExamples?: string[];
    };

    type ConfirmationPresentationField = {
      label: string;
      value: string | number;
      tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
    };

    type ConfirmationPresentation = {
      title: string;
      summary?: string;
      summaryKey?: App.I18n.I18nKey;
      summaryParams?: Record<string, string | number>;
      fields: ConfirmationPresentationField[];
      warnings: string[];
      warningKeys?: App.I18n.I18nKey[];
    };

    type PendingAction = {
      actionId: string;
      confirmationId: string;
      sourceUserMessageId: string;
      traceId: string;
      tool: string;
      toolCallId: string;
      sourceToolCallId?: string | null;
      interactionFlow: 'direct' | 'prepared';
      presentation: ConfirmationPresentation;
      expiresAt: string;
    };

    /** Minimal terminal status returned after presentation access is revoked. */
    type PendingActionStatus = {
      confirmationId: string;
      status: string;
      errorCode: 'AI_RESULT_PROJECTION_FORBIDDEN';
      finishedAt: string | null;
    };

    type PendingActionProjection = PendingAction | PendingActionStatus;

    /** supported tool-result presentation types */
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
       * Optional API path for an authenticated Blob download, for example
       * `/system/user/export/{export_id}/download`.
       */
      downloadUrl?: string;
      /** suggested browser download filename */
      downloadFilename?: string;
    };

    /** plain_json view_data schema（自由 dict） */
    type PlainJsonViewData = Record<string, unknown>;

    /** structured tool result routed to a component by viewType */
    type UIResult = {
      viewType: ViewType;
      viewData: RowsAffectedViewData | DataListViewData | StatsChartViewData | DetailCardViewData | PlainJsonViewData;
      audit?: Record<string, unknown>;
      labelKey?: string;
      labelParams?: Record<string, unknown>;
    };

    /** emitted when a tool call starts */
    type ToolCallStartedEvent = {
      type: 'tool_call_started';
      tool: string;
      toolCallId: string;
      summary: string;
      args: Record<string, any>;
      /** risk level used by the card accent and badge */
      risk: 'low' | 'high' | 'destructive';
      /** trace used to replay the tool filters on the destination page */
      traceId: string;
      /** backend-provided navigation target; avoids a duplicated frontend mapping */
      chipTarget?: string | null;
    };

    /** emitted when a tool call finishes */
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
      /** structured result rendered according to ui.viewType */
      ui?: UIResult;
    };

    /** requests human confirmation before the tool may continue */
    type ConfirmationRequiredEvent = {
      type: 'confirmation_required';
      confirmationId: string;
      tool: string;
      toolCallId: string;
      summary: string;
      expiresAt: string; // ISO 8601 UTC
      dryRun?: DryRunSummary;
      actionId?: string;
      sourceToolCallId?: string | null;
      interactionFlow?: 'direct' | 'prepared';
      presentation?: ConfirmationPresentation;
      /** client-side durable owner metadata populated from conversation detail */
      sourceUserMessageId?: string;
      /** client-side durable run key populated from conversation detail */
      traceId?: string;
    };

    /** restores a confirmation window after reconnecting its event stream */
    type ConfirmationResumedEvent = {
      type: 'confirmation_resumed';
      confirmationId: string;
      tool: string;
      toolCallId: string;
      summary: string;
      expiresAt: string; // ISO 8601 UTC
      dryRun?: DryRunSummary;
      resumedAt: string;
      actionId?: string;
      sourceToolCallId?: string | null;
      interactionFlow?: 'direct' | 'prepared';
      presentation?: ConfirmationPresentation;
      /** client-side durable owner metadata populated from conversation detail */
      sourceUserMessageId?: string;
      /** client-side durable run key populated from conversation detail */
      traceId?: string;
    };

    /** stream-level application error */
    type AiErrorEvent = {
      type: 'ai_error';
      errorCode: string;
      message: string;
    };

    /** candidate Agent offered when routing needs user clarification */
    type ClarificationCandidate = {
      code: string;
      name: string;
      description: string;
    };

    type ClarificationRequiredEvent = {
      type: 'clarification_required';
      candidates: ClarificationCandidate[];
      message: string;
      reasonCode?: 'quota_exceeded' | 'selection_required';
    };

    /** terminal stream acknowledgement */
    type DoneEvent = {
      type: 'done';
      traceId?: string;
      messageId?: string;
      persistence?: 'committed' | 'failed' | 'not_applicable';
      projection?: 'updated' | 'unchanged';
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

    /** routing feedback request for POST /ai/messages/{id}/routing-feedback */
    type RoutingFeedbackRequest = {
      /** 'correct' | 'wrong' */
      feedback: 'correct' | 'wrong';
      /** feedback='wrong' 时必填，用户选择的正确 Agent code */
      correctedAgentCode?: string;
    };

    /** routing feedback response */
    type RoutingFeedbackResponse = {
      feedbackId: string;
    };

    /** /ai/confirm 请求 */
    type ConfirmRequest = {
      confirmationId: string;
      action: 'approve' | 'reject';
    };

    /** /ai/confirm 响应 data */
    type ConfirmResponse = {
      actionId?: string | null;
      toolCallId: string;
      status: 'queued' | 'stream_gone' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'expired';
    };

    /** operation status used when a confirmation stream disconnects */
    type OperationLog = {
      toolCallId: string;
      toolName: string;
      status: 'running' | 'pending_confirmation' | 'success' | 'failed' | 'rejected' | 'expired';
      errorCode: string | null;
      startedAt: string;
      finishedAt: string | null;
      durationMs: number | null;
    };

    /** cached query filters replayed after navigating from a tool card */
    type QueryCache = {
      toolName: string;
      module: string;
      filters: Record<string, any>;
      createdAt: string;
    };

    /** Agent available in the chat selector */
    type Agent = {
      code: string;
      name: string;
      description: string;
      modelPreference: string | null;
      displayOrder: number;
    };
  }
}
