declare namespace Api {
  namespace AiAgent {
    type RiskAppetite = 'conservative' | 'balanced' | 'aggressive';

    interface AdminListItem {
      agentId: string;
      code: string;
      name: string;
      i18nKeys?: Record<string, string> | null;
      description: string;
      enabled: boolean;
      isBuiltin: boolean;
      displayOrder: number;
      modelPreference: string | null;
      dailyQuotaPerUser: number | null;
      riskAppetite: RiskAppetite;
      createTime: string;
      updateTime: string;
    }

    interface AdminDetailItem extends AdminListItem {
      systemPrompt: string;
    }

    interface AdminUpdateReq {
      name?: string;
      description?: string;
      enabled?: boolean;
      displayOrder?: number;
      systemPrompt?: string;
      modelPreference?: string | null;
      dailyQuotaPerUser?: number | null;
      riskAppetite?: RiskAppetite;
    }

    /** 前端筛选模型 — 'all' | 'enabled' | 'disabled'，避免 NSelect 三态 boolean union */
    interface AdminListSearchParams {
      keyword: string | null;
      enabledFilter: 'all' | 'enabled' | 'disabled' | null;
    }

    interface AgentRow {
      agentId: string;
      code: string;
      name: string;
      i18nKeys?: Record<string, string> | null;
      description: string;
      enabled: boolean;
      isBuiltin: boolean;
      isShared: boolean;
      tools: AgentToolRow[];
    }

    interface AgentToolRow {
      name: string;
      summary: string;
      readonly: boolean;
      enabled: boolean;
      requiredPermissions: Array<{ code: string; granted: boolean }>;
    }

    interface RoleAgentBinding {
      roleId: string;
      allAgents: AgentRow[];
      boundAgentIds: string[];
      aiChatEntryGranted: boolean;
    }

    interface RoleAgentBindReq {
      agentIds: string[];
    }
  }
}
