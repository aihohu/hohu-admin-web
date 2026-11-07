import { describe, expect, it } from 'vitest';
import { $t, setLocale } from '@/locales';

describe('field policy purpose labels', () => {
  it('resolves Chinese and English management purposes', () => {
    setLocale('zh-CN');
    expect($t('fieldPolicy.management_read')).toBe('管理读取');
    expect($t('fieldPolicy.management_query')).toBe('管理查询');
    expect($t('fieldPolicy.system_user')).toBe('用户');
    setLocale('en-US');
    expect($t('fieldPolicy.management_read')).toBe('Management read');
    setLocale('zh-CN');
  });
});
