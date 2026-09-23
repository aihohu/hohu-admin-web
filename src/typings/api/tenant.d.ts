declare namespace Api {
  namespace Tenant {
    interface Record {
      tenantId: string;
      tenantCode: string;
      tenantName: string;
      enabled: boolean;
      lifecycleState: 'prepared' | 'active' | 'disabled';
      bootstrapStatus: 'pending' | 'ready';
      rowVersion: number;
      createdAt: string;
      updatedAt: string;
    }
    interface Page {
      records: Record[];
      total: number;
      current: number;
      size: number;
    }
    interface Bootstrap {
      adminUsername: string;
      modelLabel: string;
      replayed: boolean;
    }
    interface Policy {
      modelId: string;
      modelName: string;
      providerName: string;
      enabled: boolean;
      isDefault: boolean;
      modelAvailable: boolean;
      dailyQuotaPerUser: number | null;
    }
  }
}
