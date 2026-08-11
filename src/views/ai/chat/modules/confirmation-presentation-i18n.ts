type Translate = (key: App.I18n.I18nKey, params?: Record<string, string | number>) => string;

type ConfirmationField = Api.Ai.ConfirmationPresentationField;

export type LocalizedConfirmationField = ConfirmationField & {
  displayLabel: string;
  displayValue: string | number;
};

const USER_IMPORT_TOOL = 'user.import_execute';
const USER_EXPORT_TOOL = 'user.export';

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

export function localizeConfirmationTool(tool: string, t: Translate): string {
  if (tool === USER_IMPORT_TOOL) return `${t('common.importModal.title')} (${tool})`;
  if (tool === USER_EXPORT_TOOL) return `${t('common.exportModal.title')} (${tool})`;
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
    const count = fields.find(field => field.label === 'affectedCount')?.value ?? '—';
    return t('common.exportModal.aiConfirmSummary', { count });
  }
  return summary;
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
