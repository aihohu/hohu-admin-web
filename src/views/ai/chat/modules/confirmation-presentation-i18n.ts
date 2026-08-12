type Translate = (key: App.I18n.I18nKey, params?: Record<string, string | number>) => string;

type ConfirmationField = Api.Ai.ConfirmationPresentationField;

export type LocalizedConfirmationField = ConfirmationField & {
  displayLabel: string;
  displayValue: string | number;
};

const USER_IMPORT_TOOL = 'user.import_execute';
const USER_EXPORT_TOOL = 'user.export';
const USER_CREATE_TOOL = 'user.create';
const USER_RESET_PASSWORD_TOOL = 'user.reset_password';
const USER_UPDATE_TOOL = 'user.update';
const LOCALIZED_DRY_RUN_TOOLS = new Set([
  USER_IMPORT_TOOL,
  USER_EXPORT_TOOL,
  USER_CREATE_TOOL,
  USER_RESET_PASSWORD_TOOL,
  USER_UPDATE_TOOL
]);

const USER_IMPORT_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  total: 'common.importHistoryDrawer.totalRowsLabel',
  new: 'common.importHistoryDrawer.summaryNewLabel',
  exists: 'common.importHistoryDrawer.summaryExistsLabel',
  conflict: 'common.importHistoryDrawer.summaryConflictLabel',
  outOfScope: 'common.importHistoryDrawer.summaryOutOfScopeLabel',
  onConflict: 'common.importModal.onConflictLabel',
  syncMode: 'common.importModal.syncModeLabel'
};

const USER_IMPORT_FIELD_VALUE_KEYS: Record<string, Record<string, App.I18n.I18nKey>> = {
  onConflict: {
    skip: 'common.importModal.onConflictSkip',
    overwrite: 'common.importModal.onConflictOverwrite',
    fail_fast: 'common.importModal.onConflictFailFast'
  },
  syncMode: {
    CREATE_ONLY: 'common.importModal.syncModeCreateOnly',
    UPDATE_PROFILE: 'common.importModal.syncModeUpdateProfile',
    FULL_SYNC: 'common.importModal.syncModeFullSync'
  }
};

const USER_EXPORT_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  reason: 'common.exportModal.reasonLabel',
  affectedCount: 'common.exportModal.estimatedRowsLabel'
};

const USER_CREATE_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  user_name: 'page.system.user.userName',
  primary_dept_id: 'page.system.user.primaryDept',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const USER_RESET_PASSWORD_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  user_id: 'page.ai.chat.userId',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const USER_UPDATE_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  user_id: 'page.ai.chat.targetUser',
  nickname: 'page.system.user.nickname',
  user_email: 'page.system.user.userEmail',
  user_phone: 'page.system.user.userPhone',
  user_gender: 'page.system.user.userGender',
  status: 'page.system.user.userStatus',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const USER_UPDATE_FIELD_VALUE_KEYS: Record<string, Record<string, App.I18n.I18nKey>> = {
  user_gender: {
    '0': 'page.system.user.gender.unknown',
    '1': 'page.system.user.gender.male',
    '2': 'page.system.user.gender.female'
  },
  status: {
    '1': 'page.system.common.status.enable',
    '2': 'page.system.common.status.disable'
  }
};

function findFieldValue(fields: ConfirmationField[], label: string): string | number {
  return fields.find(field => field.label === label)?.value ?? '—';
}

export function localizeConfirmationTool(tool: string, t: Translate): string {
  if (tool === USER_IMPORT_TOOL) return `${t('common.importModal.title')} (${tool})`;
  if (tool === USER_EXPORT_TOOL) return `${t('common.exportModal.title')} (${tool})`;
  if (tool === USER_CREATE_TOOL) return `${t('page.system.user.addUser')} (${tool})`;
  if (tool === USER_RESET_PASSWORD_TOOL) return `${t('page.system.user.resetPwd.title')} (${tool})`;
  if (tool === USER_UPDATE_TOOL) return `${t('page.system.user.editUser')} (${tool})`;
  return tool;
}

export function localizeConfirmationSummary(
  tool: string,
  summary: string,
  t: Translate,
  fields: ConfirmationField[] = []
): string {
  if (tool === USER_IMPORT_TOOL) return t('common.importModal.confirmImport');
  if (tool === USER_EXPORT_TOOL) {
    const count = findFieldValue(fields, 'affectedCount');
    return t('common.exportModal.aiConfirmSummary', { count });
  }
  if (tool === USER_CREATE_TOOL) {
    return t('page.ai.chat.confirmCreateUserSummary', { userName: findFieldValue(fields, 'user_name') });
  }
  if (tool === USER_RESET_PASSWORD_TOOL) {
    return t('page.ai.chat.confirmResetPasswordSummary', { userId: findFieldValue(fields, 'user_id') });
  }
  if (tool === USER_UPDATE_TOOL) {
    const changedFields = fields.filter(field => field.label !== 'user_id' && field.label !== 'affectedCount');
    if (changedFields.length === 1) {
      const changedField = localizeConfirmationField(tool, changedFields[0], t);
      return t('page.ai.chat.confirmUpdateUserSingleSummary', {
        userName: findFieldValue(fields, 'user_id'),
        fieldName: changedField.displayLabel,
        value: changedField.displayValue
      });
    }
    if (changedFields.length > 1) {
      return t('page.ai.chat.confirmUpdateUserMultipleSummary', {
        userName: findFieldValue(fields, 'user_id'),
        count: changedFields.length
      });
    }
  }
  return summary;
}

export function localizeConfirmationDryRun(
  tool: string,
  dryRun: Api.Ai.DryRunSummary,
  t: Translate,
  fields: ConfirmationField[] = []
): Api.Ai.DryRunSummary {
  if (!LOCALIZED_DRY_RUN_TOOLS.has(tool)) return dryRun;
  return {
    ...dryRun,
    summary: tool === USER_UPDATE_TOOL ? '' : localizeConfirmationSummary(tool, dryRun.summary, t, fields),
    affectedExamples: []
  };
}

export function localizeConfirmationField(
  tool: string,
  field: ConfirmationField,
  t: Translate
): LocalizedConfirmationField {
  if (tool === USER_EXPORT_TOOL) {
    const labelKey = USER_EXPORT_FIELD_LABEL_KEYS[field.label];
    return {
      ...field,
      displayLabel: labelKey ? t(labelKey) : field.label,
      displayValue: field.value
    };
  }

  if (tool === USER_CREATE_TOOL || tool === USER_RESET_PASSWORD_TOOL || tool === USER_UPDATE_TOOL) {
    const labelKeys =
      tool === USER_CREATE_TOOL
        ? USER_CREATE_FIELD_LABEL_KEYS
        : tool === USER_RESET_PASSWORD_TOOL
          ? USER_RESET_PASSWORD_FIELD_LABEL_KEYS
          : USER_UPDATE_FIELD_LABEL_KEYS;
    const labelKey = labelKeys[field.label];
    const valueKey =
      tool === USER_UPDATE_TOOL && typeof field.value === 'string'
        ? USER_UPDATE_FIELD_VALUE_KEYS[field.label]?.[field.value]
        : undefined;
    return {
      ...field,
      displayLabel: labelKey ? t(labelKey) : field.label,
      displayValue: valueKey ? t(valueKey) : field.value
    };
  }

  if (tool !== USER_IMPORT_TOOL) {
    return { ...field, displayLabel: field.label, displayValue: field.value };
  }

  const labelKey = USER_IMPORT_FIELD_LABEL_KEYS[field.label];
  const valueKey =
    typeof field.value === 'string' ? USER_IMPORT_FIELD_VALUE_KEYS[field.label]?.[field.value] : undefined;

  return {
    ...field,
    displayLabel: labelKey ? t(labelKey) : field.label,
    displayValue: valueKey ? t(valueKey) : field.value
  };
}
