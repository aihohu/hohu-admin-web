declare namespace Api {
  namespace Platform {
    interface Identity {
      principalId: string;
      principalName: string;
      permissions: string[];
    }
    interface AuditContext {
      reason: string;
      ticket: string;
    }
  }
}
