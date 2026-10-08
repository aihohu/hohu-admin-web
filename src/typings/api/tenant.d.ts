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
    interface ModelCatalogItem extends Policy {
      providerId: string;
      capabilities: string[];
      unavailableReason: 'provider_disabled' | 'model_disabled' | 'text_required' | null;
    }
    interface ModelCatalog {
      models: ModelCatalogItem[];
      revision: string;
    }
    interface PoliciesPut {
      revision: string;
      policies: Pick<Policy, 'modelId' | 'enabled' | 'isDefault' | 'dailyQuotaPerUser'>[];
    }
  }
}
