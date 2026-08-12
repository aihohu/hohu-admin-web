type Translate = (key: App.I18n.I18nKey) => string;
type HasTranslation = (key: App.I18n.I18nKey) => boolean;

const TOOL_DESCRIPTION_KEYS: Record<string, App.I18n.I18nKey> = {
  'user.create': 'page.system.user.addUser',
  'user.dept_lookup': 'page.ai.chat.deptLookup',
  'user.reset_password': 'page.system.user.resetPwd.title'
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
  const key = `common.${code}` as App.I18n.I18nKey;
  if (te(key)) return t(key);
  return fallback[code] || code;
}
