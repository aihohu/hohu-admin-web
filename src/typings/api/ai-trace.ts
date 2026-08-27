declare namespace Api {
  namespace AiTrace {
    interface Target {
      type: string;
      id: string;
    }

    interface Summary {
      traceId: string;
      actorId: string;
      actorName: string;
      agentCodes: string[];
      toolNames: string[];
      statuses: string[];
      operationCount: number;
      queuedAt: string;
      finishedAt: string | null;
    }

    interface Operation {
      logId: string;
      toolCallId: string;
      toolName: string;
      agentCode: string;
      actorId: string;
      actorName: string | null;
      sourceMessageId: string | null;
      sourceMessageRole: string | null;
      sourceMessageAt: string | null;
      targetSummary: Target[];
      executionMode: string;
      riskLevel: string;
      status: string;
      errorCode: string | null;
      confirmationId: string | null;
      approvedBy: string | null;
      queuedAt: string;
      startedAt: string | null;
      finishedAt: string | null;
      durationMs: number | null;
      hitlWaitMs: number | null;
    }

    interface Detail {
      traceId: string;
      conversationId: string;
      operations: Operation[];
    }

    interface ListQuery {
      current: number;
      size: number;
      traceId?: string;
      actorId?: string;
      agentCode?: string;
      toolName?: string;
      status?: string;
      queuedFrom?: number;
      queuedTo?: number;
    }
  }
}
