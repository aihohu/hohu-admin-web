import { describe, expect, it } from 'vitest';
import { $t, setLocale } from '@/locales';

describe('field policy purpose labels', () => {
  it('compiles the task argument hint in both real locale messages', () => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      setLocale(locale);
      expect(() => $t('fieldPolicy.emptyTaskArgs')).not.toThrow();
      expect($t('fieldPolicy.emptyTaskArgs')).not.toBe('fieldPolicy.emptyTaskArgs');
    }
    setLocale('zh-CN');
  });
  it.each([
    'system_role',
    'system_operation_log',
    'system_login_log',
    'job_log',
    'ai_agent',
    'ai_conversation',
    'ai_message',
    'ai_operation_log',
    'ai_routing_log',
    'ai_routing_feedback',
    'system_dept',
    'system_menu',
    'system_config',
    'system_file',
    'transfer_import',
    'transfer_export',
    'transfer_audit',
    'content',
    'owner_name',
    'original_name',
    'row_count',
    'counts',
    'range',
    'system_setting',
    'job_definition',
    'config_value',
    'job_args',
    'next_run_time',
    'default_avatar',
    'upload:max_bytes',
    'auth:default_password',
    'role_name',
    'leader',
    'menu_name',
    'role_names',
    'dept_names'
  ])('labels relation catalog key %s in both languages', key => {
    for (const locale of ['zh-CN', 'en-US'] as const) {
      setLocale(locale);
      expect($t(`fieldPolicy.${key}`)).not.toBe(`fieldPolicy.${key}`);
    }
    setLocale('zh-CN');
  });
  it('resolves Chinese and English management purposes', () => {
    setLocale('zh-CN');
    expect($t('fieldPolicy.management_read')).toBe('管理读取');
    expect($t('fieldPolicy.management_query')).toBe('管理查询');
    expect($t('fieldPolicy.system_user')).toBe('用户');
    expect($t('fieldPolicy.system_dict_type')).toBe('字典类型');
    expect($t('fieldPolicy.system_dict_data')).toBe('字典项');
    expect($t('fieldPolicy.data_title')).toBe('标题');
    expect($t('fieldPolicy.title')).toBe('字段权限');
    expect($t('fieldPolicy.sort')).toBe('排序');
    expect($t('fieldPolicy.remark')).toBe('备注');
    setLocale('en-US');
    expect($t('fieldPolicy.management_read')).toBe('Management read');
    setLocale('zh-CN');
  });
});
