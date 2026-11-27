import { expect, it } from 'vitest';
import { projectedUserColumn, userListColumns } from '../user-list-columns';

it('omits unprojected fields from the table and column picker', () => {
  const rows = [{ userId: '1', userName: 'reader' }];
  const columns = [{ key: 'index' }, { key: 'userName' }, { key: 'nickname' }];
  expect(userListColumns(columns, rows, '无权限').map(col => 'key' in col && col.key)).toEqual(['index', 'userName']);
  expect(projectedUserColumn('nickname', rows)).toBe(false);
  expect(projectedUserColumn('userName', [])).toBe(false);
});
it('distinguishes an omitted cell from a real empty value on a mixed page', () => {
  const rows = [{ userId: '1', userEmail: null }, { userId: '2' }, { userId: '3', userEmail: 'display' }];
  const [column] = userListColumns([{ key: 'userEmail' }], rows, '无权限');
  expect(rows.map((row, i) => column && 'render' in column && column.render?.(row, i))).toEqual([
    '—',
    '无权限',
    'display'
  ]);
});
