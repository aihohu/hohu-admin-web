import { describe, expect, it } from 'vitest';
import enUs from '@/locales/langs/en-us';
import zhCn from '@/locales/langs/zh-cn';
import { localizeClarificationMessage, localizeErrorCode } from '../dynamic-message-i18n';

const messages: Record<string, string> = {
  'errorCode.AI_CHAT_GUARD_LOST': 'The conversation lock expired. Refresh and try again.',
  'page.ai.chat.clarificationQuotaExceeded': 'AI routing quota exhausted. Choose an agent manually.',
  'page.ai.chat.clarificationSelectionRequired': 'Choose the type of help you need.'
};

const t = (key: App.I18n.I18nKey) => messages[key] ?? key;
const te = (key: App.I18n.I18nKey) => key in messages;

describe('dynamic AI message i18n', () => {
  it('defines the runtime tool-permission revocation code in global locales', () => {
    expect(enUs.errorCode.AI_TOOL_PERM_DENIED).toBe('Tool permission was revoked. Start the operation again.');
    expect(zhCn.errorCode.AI_TOOL_PERM_DENIED).toBe('工具权限已被撤销，请重新发起操作');
  });

  it('defines the canonical enable-status validation code in global locales', () => {
    expect(enUs.errorCode.AI_ENABLE_STATUS_INVALID).toBe('Status must be 1 (enabled) or 2 (disabled)');
    expect(zhCn.errorCode.AI_ENABLE_STATUS_INVALID).toBe('状态必须是 1（启用）或 2（禁用）');
  });

  it('localizes stream errors by stable error code without using backend-language copy', () => {
    expect(localizeErrorCode('AI_CHAT_GUARD_LOST', '会话执行锁已失效，请刷新后重试', t, te)).toBe(
      'The conversation lock expired. Refresh and try again.'
    );
    expect(localizeErrorCode('UNKNOWN_CODE', 'Backend fallback', t, te)).toBe('Backend fallback');
    expect(localizeErrorCode('UNKNOWN_CODE', '', t, te)).toBe('UNKNOWN_CODE');
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
