type Translate = (key: App.I18n.I18nKey, params?: Record<string, string | number>) => string;
type HasTranslation = (key: App.I18n.I18nKey) => boolean;

const CLARIFICATION_KEYS: Record<string, App.I18n.I18nKey> = {
  quota_exceeded: 'page.ai.chat.clarificationQuotaExceeded',
  selection_required: 'page.ai.chat.clarificationSelectionRequired'
};

export function localizeErrorCode(errorCode: string, backendMessage: string, t: Translate, te: HasTranslation): string {
  const key = `errorCode.${errorCode}` as App.I18n.I18nKey;
  if (te(key)) return t(key);
  return backendMessage || errorCode;
}

export function localizeClarificationMessage(
  event: Pick<Api.Ai.ClarificationRequiredEvent, 'message' | 'reasonCode'>,
  t: Translate,
  te: HasTranslation
): string {
  const key = event.reasonCode ? CLARIFICATION_KEYS[event.reasonCode] : undefined;
  if (key && te(key)) return t(key);
  return event.message;
}
