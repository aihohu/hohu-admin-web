type Translate = (key: App.I18n.I18nKey) => string;
type HasTranslation = (key: App.I18n.I18nKey) => boolean;

const TOOL_DESCRIPTION_KEYS: Record<string, App.I18n.I18nKey> = {
  'user.create': 'page.system.user.addUser',
  'user.dept_lookup': 'page.ai.chat.deptLookup',
  'user.reset_password': 'page.system.user.resetPwd.title',
  'user.lookup': 'page.ai.chat.toolDescriptions.userLookup',
  'user.list': 'page.ai.chat.toolDescriptions.userList',
  'user.update_dept': 'page.ai.chat.toolDescriptions.userUpdateDept',
  'user.update_email': 'page.ai.chat.toolDescriptions.userUpdateEmail',
  'user.batch_delete': 'page.ai.chat.toolDescriptions.userBatchDelete',
  'user.disable': 'page.ai.chat.toolDescriptions.userDisable',
  'user.enable': 'page.ai.chat.toolDescriptions.userEnable',
  'user.distinct': 'page.ai.chat.toolDescriptions.userDistinct',
  'user.count': 'page.ai.chat.toolDescriptions.userCount',
  'user.stats': 'page.ai.chat.toolDescriptions.userStats',
  'role.count': 'page.ai.chat.toolDescriptions.roleCount',
  'role.list': 'page.ai.chat.toolDescriptions.roleList',
  'dept.count': 'page.ai.chat.toolDescriptions.deptCount',
  'dept.list': 'page.ai.chat.toolDescriptions.deptList',
  'dept.export_members': 'page.ai.chat.toolDescriptions.deptExportMembers',
  'role.bind_menus': 'page.ai.chat.toolDescriptions.roleBindMenus',
  'file.parse': 'page.ai.chat.toolDescriptions.fileParse',
  'job.update_cron': 'page.ai.chat.toolDescriptions.jobUpdateCron'
};

const TOOL_ERROR_KEYS: Record<string, App.I18n.I18nKey> = {
  AI_TOOL_NOT_FOUND: 'page.ai.chat.toolErrors.AI_TOOL_NOT_FOUND',
  AI_TOOL_PERM_DENIED: 'page.ai.chat.toolErrors.AI_TOOL_PERM_DENIED',
  AI_DATA_SCOPE_VIOLATION: 'page.ai.chat.toolErrors.AI_DATA_SCOPE_VIOLATION',
  AI_RATE_LIMIT_USER_WRITE: 'page.ai.chat.toolErrors.AI_RATE_LIMIT_USER_WRITE',
  AI_DAILY_QUOTA_EXHAUSTED: 'page.ai.chat.toolErrors.AI_DAILY_QUOTA_EXHAUSTED',
  AI_TOOL_TIMEOUT: 'page.ai.chat.toolErrors.AI_TOOL_TIMEOUT',
  AI_REPEATED_FAILURE: 'page.ai.chat.toolErrors.AI_REPEATED_FAILURE',
  AI_INTERNAL_ERROR: 'page.ai.chat.toolErrors.AI_INTERNAL_ERROR',
  AI_HITL_EXPIRED: 'page.ai.chat.toolErrors.AI_HITL_EXPIRED',
  USER_REJECTED: 'page.ai.chat.toolErrors.USER_REJECTED',
  AI_STATS_FIELD_NOT_ALLOWED: 'page.ai.chat.toolErrors.AI_STATS_FIELD_NOT_ALLOWED'
};

export function localizeToolDescription(
  tool: string,
  t: Translate,
  te: HasTranslation,
  fallback: Record<string, string> = {}
): string {
  const key = TOOL_DESCRIPTION_KEYS[tool];
  if (key && te(key)) return t(key);
  return fallback[tool] || '';
}

export function localizeToolError(
  code: string,
  t: Translate,
  te: HasTranslation,
  fallback: Record<string, string> = {}
): string {
  const globalKey = `errorCode.${code}` as App.I18n.I18nKey;
  const key = TOOL_ERROR_KEYS[code] || globalKey;
  if (te(key)) return t(key);
  return fallback[code] || code;
}
