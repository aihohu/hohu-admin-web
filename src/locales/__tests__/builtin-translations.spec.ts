import { afterEach, describe, expect, it } from 'vitest';
import { localizedText, setLocale } from '../index';
import en from '../langs/builtin-en-us.json';
import zh from '../langs/builtin-zh-cn.json';

afterEach(() => setLocale('zh-CN'));
describe('built-in display text', () => {
  it('switches language without changing custom values', () => {
    setLocale('en-US');
    expect(localizedText('普通用户', 'builtin.role.user.roleName')).toBe('Standard user');
    expect(localizedText('我的角色', null)).toBe('我的角色');
    expect(localizedText('Fallback', 'builtin.missing')).toBe('Fallback');
    setLocale('zh-CN');
    expect(localizedText('普通用户', 'builtin.role.user.roleName')).toBe('普通用户');
  });
  it('ships matching language catalog keys', () => {
    function keys(value: object, prefix = ''): string[] {
      return Object.entries(value)
        .flatMap(([key, item]) =>
          typeof item === 'object' && item !== null ? keys(item, `${prefix}${key}.`) : [`${prefix}${key}`]
        )
        .sort();
    }
    expect(keys(en)).toEqual(keys(zh));
  });
});
