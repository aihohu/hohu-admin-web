type Translate = (key: App.I18n.I18nKey, params?: Record<string, string | number>) => string;

type ConfirmationField = Api.Ai.ConfirmationPresentationField;

export type LocalizedConfirmationField = ConfirmationField & {
  displayLabel: string;
  displayValue: string | number;
};

export type ConfirmationTechnicalField = {
  label: string;
  value: string | number;
};

const USER_IMPORT_TOOL = 'user.import_execute';
const USER_EXPORT_TOOL = 'user.export';
const USER_CREATE_TOOL = 'user.create';
const USER_RESET_PASSWORD_TOOL = 'user.reset_password';
const USER_UPDATE_TOOL = 'user.update';
const USER_UPDATE_DEPT_TOOL = 'user.update_dept';
const USER_UPDATE_ROLES_TOOL = 'user.update_roles';
const ROLE_CREATE_TOOL = 'role.create';
const ROLE_UPDATE_TOOL = 'role.update';
const ROLE_UPDATE_MENUS_TOOL = 'role.update_menus';
const ROLE_UPDATE_AGENTS_TOOL = 'role.update_agents';
export const ROLE_MEMBER_IMPACT_TOOLS = new Set([ROLE_UPDATE_TOOL, ROLE_UPDATE_MENUS_TOOL, ROLE_UPDATE_AGENTS_TOOL]);
const DEPT_CREATE_TOOL = 'dept.create';
const DEPT_UPDATE_TOOL = 'dept.update';
const DEPT_MOVE_TOOL = 'dept.move';
const PHASE3_WRITE_TOOLS = new Set([
  ROLE_CREATE_TOOL,
  ROLE_UPDATE_TOOL,
  ROLE_UPDATE_MENUS_TOOL,
  ROLE_UPDATE_AGENTS_TOOL,
  DEPT_CREATE_TOOL,
  DEPT_UPDATE_TOOL,
  DEPT_MOVE_TOOL
]);
const LOCALIZED_DRY_RUN_TOOLS = new Set([
  USER_IMPORT_TOOL,
  USER_EXPORT_TOOL,
  USER_CREATE_TOOL,
  USER_RESET_PASSWORD_TOOL,
  USER_UPDATE_TOOL,
  USER_UPDATE_DEPT_TOOL,
  USER_UPDATE_ROLES_TOOL,
  ...PHASE3_WRITE_TOOLS
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

const ENABLE_STATUS_VALUE_KEYS: Record<string, App.I18n.I18nKey> = {
  '1': 'page.system.common.status.enable',
  '2': 'page.system.common.status.disable'
};

const ROLE_DATA_SCOPE_VALUE_KEYS: Record<string, App.I18n.I18nKey> = {
  '1': 'page.system.role.dataScope.all',
  ALL: 'page.system.role.dataScope.all',
  '2': 'page.system.role.dataScope.custom',
  CUSTOM: 'page.system.role.dataScope.custom',
  '3': 'page.system.role.dataScope.dept',
  DEPT: 'page.system.role.dataScope.dept',
  '4': 'page.system.role.dataScope.deptAndSub',
  DEPT_AND_SUB: 'page.system.role.dataScope.deptAndSub',
  '5': 'page.system.role.dataScope.self',
  SELF: 'page.system.role.dataScope.self'
};

const USER_UPDATE_DEPT_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  user_id: 'page.ai.chat.targetUser',
  dept_assignments: 'page.ai.chat.departmentAssignments',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const USER_UPDATE_ROLES_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  user_id: 'page.ai.chat.targetUser',
  role_ids: 'page.ai.chat.roleAssignments',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const ROLE_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  role_id: 'page.ai.chat.targetRole',
  role_code: 'page.ai.chat.roleCode',
  role_name: 'page.system.role.roleName',
  role_desc: 'page.system.role.roleDesc',
  data_scope: 'page.system.role.dataScope.label',
  status: 'page.system.role.roleStatus',
  dept_ids: 'page.system.role.dataScope.selectDept',
  changes: 'page.ai.chat.roleDefinitionFields',
  changed_fields: 'page.ai.chat.roleDefinitionFields',
  menu_ids: 'page.ai.chat.completeMenuSet',
  agent_ids: 'page.ai.chat.completeAgentSet',
  affected_users: 'page.ai.chat.affectedUsers',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const DEPT_FIELD_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  dept_id: 'page.ai.chat.targetDepartment',
  dept_name: 'page.system.dept.deptName',
  order_num: 'page.system.dept.orderNum',
  leader: 'page.system.dept.leader',
  phone: 'page.system.dept.phone',
  email: 'page.system.dept.email',
  parent_id: 'page.ai.chat.parentDepartment',
  new_parent_id: 'page.ai.chat.newParentDepartment',
  status: 'page.system.dept.deptStatus',
  changes: 'page.ai.chat.departmentFields',
  changed_fields: 'page.ai.chat.departmentFields',
  affected_users: 'page.ai.chat.affectedUsers',
  affectedCount: 'page.ai.chat.confirmAffected'
};

const PHASE3_TOOL_LABEL_KEYS: Record<string, App.I18n.I18nKey> = {
  [ROLE_CREATE_TOOL]: 'page.ai.chat.createRole',
  [ROLE_UPDATE_TOOL]: 'page.ai.chat.updateRole',
  [ROLE_UPDATE_MENUS_TOOL]: 'page.ai.chat.updateRoleMenus',
  [ROLE_UPDATE_AGENTS_TOOL]: 'page.ai.chat.updateRoleAgents',
  [DEPT_CREATE_TOOL]: 'page.ai.chat.createDepartment',
  [DEPT_UPDATE_TOOL]: 'page.ai.chat.updateDepartment',
  [DEPT_MOVE_TOOL]: 'page.ai.chat.moveDepartment'
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
  if (tool === USER_UPDATE_DEPT_TOOL) return `${t('page.ai.chat.updateUserDepartments')} (${tool})`;
  if (tool === USER_UPDATE_ROLES_TOOL) return `${t('page.ai.chat.updateUserRoles')} (${tool})`;
  const phase3LabelKey = PHASE3_TOOL_LABEL_KEYS[tool];
  if (phase3LabelKey) return `${t(phase3LabelKey)} (${tool})`;
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
  if (tool === USER_UPDATE_DEPT_TOOL) {
    return t('page.ai.chat.confirmUpdateDeptSummary', { userName: findFieldValue(fields, 'user_id') });
  }
  if (tool === USER_UPDATE_ROLES_TOOL) {
    return t('page.ai.chat.confirmUpdateRolesSummary', { userName: findFieldValue(fields, 'user_id') });
  }
  if (tool === ROLE_CREATE_TOOL) {
    return t('page.ai.chat.confirmRoleCreateSummary', { roleName: findFieldValue(fields, 'role_name') });
  }
  if (tool === ROLE_UPDATE_TOOL) {
    return t('page.ai.chat.confirmRoleUpdateSummary', { roleName: findFieldValue(fields, 'role_id') });
  }
  if (tool === ROLE_UPDATE_MENUS_TOOL) {
    return t('page.ai.chat.confirmRoleMenusSummary', { roleName: findFieldValue(fields, 'role_id') });
  }
  if (tool === ROLE_UPDATE_AGENTS_TOOL) {
    return t('page.ai.chat.confirmRoleAgentsSummary', { roleName: findFieldValue(fields, 'role_id') });
  }
  if (tool === DEPT_CREATE_TOOL) {
    return t('page.ai.chat.confirmDeptCreateSummary', { deptName: findFieldValue(fields, 'dept_name') });
  }
  if (tool === DEPT_UPDATE_TOOL) {
    return t('page.ai.chat.confirmDeptUpdateSummary', { deptName: findFieldValue(fields, 'dept_id') });
  }
  if (tool === DEPT_MOVE_TOOL) {
    return t('page.ai.chat.confirmDeptMoveSummary', { deptName: findFieldValue(fields, 'dept_id') });
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

  if (tool === USER_UPDATE_DEPT_TOOL) {
    const labelKey = USER_UPDATE_DEPT_FIELD_LABEL_KEYS[field.label];
    return {
      ...field,
      displayLabel: labelKey ? t(labelKey) : field.label,
      displayValue: field.value
    };
  }

  if (tool === USER_UPDATE_ROLES_TOOL) {
    const labelKey = USER_UPDATE_ROLES_FIELD_LABEL_KEYS[field.label];
    return {
      ...field,
      displayLabel: labelKey ? t(labelKey) : field.label,
      displayValue: field.value
    };
  }

  if (PHASE3_WRITE_TOOLS.has(tool)) {
    const labelKey =
      field.label === 'affectedCount' && ROLE_MEMBER_IMPACT_TOOLS.has(tool)
        ? 'page.ai.chat.affectedUsers'
        : tool.startsWith('role.')
          ? ROLE_FIELD_LABEL_KEYS[field.label]
          : DEPT_FIELD_LABEL_KEYS[field.label];
    const valueKey =
      typeof field.value === 'string'
        ? field.label === 'status'
          ? ENABLE_STATUS_VALUE_KEYS[field.value]
          : field.label === 'data_scope'
            ? ROLE_DATA_SCOPE_VALUE_KEYS[field.value]
            : undefined
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

export function buildConfirmationTechnicalFields(
  tool: string,
  fields: ConfirmationField[],
  t: Translate
): ConfirmationTechnicalField[] {
  return fields.flatMap(field => {
    const localized = localizeConfirmationField(tool, field, t);
    const rawValue = field.rawValue ?? field.value;
    const hasBoundRawValue = field.rawValue !== undefined;
    const wasLocalized = String(localized.displayValue) !== String(field.value);
    if (!hasBoundRawValue && !wasLocalized) return [];
    return [{ label: localized.displayLabel, value: rawValue }];
  });
}
