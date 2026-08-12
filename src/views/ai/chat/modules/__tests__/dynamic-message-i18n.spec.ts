import { describe, expect, it } from 'vitest';
import { localizeClarificationMessage, localizeErrorCode } from '../dynamic-message-i18n';

const messages: Record<string, string> = {
  'errorCode.AI_CHAT_GUARD_LOST': 'The conversation lock expired. Refresh and try again.',
  'page.ai.chat.clarificationQuotaExceeded': 'AI routing quota exhausted. Choose an agent manually.',
  'page.ai.chat.clarificationSelectionRequired': 'Choose the type of help you need.'
};

const t = (key: App.I18n.I18nKey) => messages[key] ?? key;
const te = (key: App.I18n.I18nKey) => key in messages;

describe('dynamic AI message i18n', () => {
  it('localizes stream errors by stable error code without using backend-language copy', () => {
    expect(localizeErrorCode('AI_CHAT_GUARD_LOST', '会话执行锁已失效，请刷新后重试', t, te)).toBe(
      'The conversation lock expired. Refresh and try again.'
    );
    expect(localizeErrorCode('UNKNOWN_CODE', 'Backend fallback', t, te)).toBe('Backend fallback');
  });

  it('localizes clarification reasons and preserves legacy message fallback', () => {
    expect(
      localizeClarificationMessage(
        { reasonCode: 'quota_exceeded', message: 'AI 路由配额已用尽，请手动选择 Agent' },
        t,
        te
      )
    ).toBe('AI routing quota exhausted. Choose an agent manually.');
    expect(localizeClarificationMessage({ message: 'Legacy message' }, t, te)).toBe('Legacy message');
  });
});
