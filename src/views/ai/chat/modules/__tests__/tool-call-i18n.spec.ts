import { describe, expect, it } from 'vitest';
import { localizeToolDescription, localizeToolError } from '../tool-call-i18n';

const messages: Record<string, string> = {
  'page.ai.chat.deptLookup': 'Find department by name',
  'page.system.user.addUser': 'Add User',
  'page.system.user.resetPwd.title': 'Reset Password',
  'page.ai.chat.toolDescriptions.userList': 'List users',
  'page.ai.chat.toolDescriptions.fileParse': 'Parse file',
  'page.ai.chat.toolErrors.AI_TOOL_TIMEOUT': 'Operation timed out',
  'common.AI_USER_DEFAULT_ROLE_NOT_FOUND': 'The default user role is missing or disabled',
  'common.AI_USER_DEPT_NAME_REQUIRED': 'Enter a department name'
};

const t = (key: App.I18n.I18nKey) => messages[key] ?? key;
const te = (key: App.I18n.I18nKey) => key in messages;

describe('tool call i18n', () => {
  it('localizes the new user-management tool descriptions', () => {
    expect(localizeToolDescription('user.create', t, te)).toBe('Add User');
    expect(localizeToolDescription('user.dept_lookup', t, te)).toBe('Find department by name');
    expect(localizeToolDescription('user.reset_password', t, te)).toBe('Reset Password');
    expect(localizeToolDescription('user.list', t, te)).toBe('List users');
    expect(localizeToolDescription('file.parse', t, te)).toBe('Parse file');
  });

  it('uses common error-code translations and preserves unknown codes', () => {
    expect(localizeToolError('AI_USER_DEFAULT_ROLE_NOT_FOUND', t, te)).toBe(
      'The default user role is missing or disabled'
    );
    expect(localizeToolError('AI_USER_DEPT_NAME_REQUIRED', t, te)).toBe('Enter a department name');
    expect(localizeToolError('AI_TOOL_TIMEOUT', t, te)).toBe('Operation timed out');
    expect(localizeToolError('UNKNOWN_CODE', t, te)).toBe('UNKNOWN_CODE');
  });
});
