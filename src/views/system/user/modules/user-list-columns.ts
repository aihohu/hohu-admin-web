type User = Api.SystemManage.User;

const structural = new Set(['__selection__', 'index', 'operate']);

export function projectedUserColumn(key: string, rows: User[]) {
  return structural.has(key) || rows.some(row => Object.hasOwn(row, key));
}

export function userListColumns(columns: NaiveUI.TableColumn<User>[], rows: User[], unavailable: string) {
  return columns.flatMap((column): NaiveUI.TableColumn<User>[] => {
    if (!('key' in column) || structural.has(column.key)) return [column];
    const key = column.key;
    if (!projectedUserColumn(key, rows)) return [];
    if ('children' in column) return [column];
    return [
      {
        ...column,
        render(row, index) {
          if (!Object.hasOwn(row, key)) return unavailable;
          if (column.render) return column.render(row, index);
          return String(Reflect.get(row, key) ?? '—');
        }
      }
    ];
  });
}
