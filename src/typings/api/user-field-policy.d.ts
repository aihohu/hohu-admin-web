declare namespace Api {
  namespace UserFieldPolicy {
    interface PolicyRule {
      fieldId: string;
      operation: string;
      purpose: string;
      effect: 'allow' | 'deny';
      read: 'plain' | 'masked';
      maskId: string | null;
    }

    interface PolicyField {
      fieldId: string;
      readable: boolean;
      maskId: string | null;
      options: Array<{ purpose: string; operation: string }>;
    }

    interface PolicyState {
      mode: 'legacy' | 'ready' | 'enforcing' | 'frozen';
      epoch: number;
      catalogDigest: string;
      candidateManifestDigest: string | null;
      activeManifestDigest: string | null;
      everEnforced: boolean;
      canActivate: boolean;
      activationBlockers: string[];
    }

    interface PolicyDocument {
      roleId: string;
      revisionId: string;
      version: number;
      archived: boolean;
      rulesDigest: string;
      createdAt: string;
      rules: PolicyRule[];
    }

    interface PolicyResponse {
      catalogRevision: string;
      catalogDigest: string;
      fields: PolicyField[];
      policy: PolicyDocument | null;
      state: PolicyState;
    }

    interface PolicyDraft {
      expectedVersion: number;
      catalogDigest: string;
      rules: PolicyRule[];
    }

    interface PolicyPreview {
      effectiveSamples: Array<{
        subjectUserId: string;
        recordUserId: string;
        fieldId: string;
        operation: string;
        purpose: string;
        before: { allowed: boolean; read: string };
        after: { allowed: boolean; read: string };
      }>;
      samplesTruncated: boolean;
      queryCoverageVerified: false;
      expectedVersion: number;
      previewKind: 'rule-diff';
      changes: Array<
        Pick<PolicyRule, 'fieldId' | 'operation' | 'purpose'> & {
          before: Pick<PolicyRule, 'effect' | 'read' | 'maskId'> | null;
          after: Pick<PolicyRule, 'effect' | 'read' | 'maskId'> | null;
        }
      >;
      state: PolicyState;
    }
  }
}
