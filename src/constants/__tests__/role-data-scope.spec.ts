import { describe, expect, it } from 'vitest';
import { roleDataScopeRecord } from '../business';

describe('roleDataScopeRecord', () => {
  it('为角色列表的五种数据权限提供稳定显示文案', () => {
    expect(roleDataScopeRecord).toEqual({
      '1': 'page.system.role.dataScope.all',
      '2': 'page.system.role.dataScope.custom',
      '3': 'page.system.role.dataScope.dept',
      '4': 'page.system.role.dataScope.deptAndSub',
      '5': 'page.system.role.dataScope.self'
    });
  });
});
