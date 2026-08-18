import { describe, expect, it } from 'vitest';
import { localizeToolDescription, localizeToolError } from '../tool-call-i18n';

const messages: Record<string, string> = {
  'page.ai.chat.deptLookup': 'Find department by name or path',
  'page.system.user.addUser': 'Add User',
  'page.system.user.resetPwd.title': 'Reset Password',
  'page.ai.chat.toolDescriptions.userList': 'List users',
  'page.ai.chat.toolDescriptions.userUpdateDept': 'Replace user departments',
  'page.ai.chat.toolDescriptions.fileParse': 'Parse file',
  'page.ai.chat.toolErrors.AI_TOOL_TIMEOUT': 'Operation timed out',
  'errorCode.AI_USER_DEFAULT_ROLE_NOT_FOUND': 'The default user role is missing or disabled',
  'errorCode.AI_USER_DEPT_QUERY_REQUIRED': 'Enter a department name or path',
  'errorCode.AI_USER_DEPT_LOOKUP_LIMIT_INVALID': 'Department result limit must be between 1 and 20',
  'errorCode.AI_PREPARED_ACTION_SNAPSHOT_STALE': 'Approval facts changed; start again',
  'errorCode.AI_LOOKUP_NO_MATCH': 'No matching user was found'
};

const t = (key: App.I18n.I18nKey) => messages[key] ?? key;
const te = (key: App.I18n.I18nKey) => key in messages;

describe('tool call i18n', () => {
  it('localizes the new user-management tool descriptions', () => {
    expect(localizeToolDescription('user.create', t, te)).toBe('Add User');
    expect(localizeToolDescription('user.dept_lookup', t, te)).toBe('Find department by name or path');
    expect(localizeToolDescription('user.reset_password', t, te)).toBe('Reset Password');
    expect(localizeToolDescription('user.list', t, te)).toBe('List users');
    expect(localizeToolDescription('user.update_dept', t, te)).toBe('Replace user departments');
    expect(localizeToolDescription('file.parse', t, te)).toBe('Parse file');
  });

  it('uses global error-code translations and preserves unknown codes', () => {
    expect(localizeToolError('AI_USER_DEFAULT_ROLE_NOT_FOUND', t, te)).toBe(
      'The default user role is missing or disabled'
    );
    expect(localizeToolError('AI_USER_DEPT_QUERY_REQUIRED', t, te)).toBe('Enter a department name or path');
    expect(localizeToolError('AI_USER_DEPT_LOOKUP_LIMIT_INVALID', t, te)).toBe(
      'Department result limit must be between 1 and 20'
    );
    expect(localizeToolError('AI_PREPARED_ACTION_SNAPSHOT_STALE', t, te)).toBe('Approval facts changed; start again');
    expect(localizeToolError('AI_LOOKUP_NO_MATCH', t, te)).toBe('No matching user was found');
    expect(localizeToolError('AI_TOOL_TIMEOUT', t, te)).toBe('Operation timed out');
    expect(localizeToolError('UNKNOWN_CODE', t, te)).toBe('UNKNOWN_CODE');
  });
});
