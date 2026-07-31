declare namespace Api {
  namespace AiAgent {
    type RiskAppetite = 'conservative' | 'balanced' | 'aggressive';

    interface AdminListItem {
      agentId: string;
      code: string;
      name: string;
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

    interface AgentRow {
      agentId: string;
      code: string;
      name: string;
      description: string;
      enabled: boolean;
      isBuiltin: boolean;
      isShared: boolean;
    }

    interface RoleAgentBinding {
      roleId: string;
      allAgents: AgentRow[];
      boundAgentIds: string[];
    }

    interface RoleAgentBindReq {
      agentIds: string[];
    }
  }
}
