import type { DataTableColumns } from 'naive-ui';
import { $t } from '@/locales';
import { fieldAllowed } from './ordinary-fields';

export type DeliveryCapabilities = { read: string[]; query: string[] };

/** Current sparse values and server hints constrain display; neither grants a request. */
export function deliveryColumns<Row extends object>(
  columns: DataTableColumns<Row>,
  rows: readonly Row[],
  policy?: DeliveryCapabilities,
  aliases: Record<string, string> = {}
): DataTableColumns<Row> {
  return columns.flatMap(column => {
    if (!('key' in column) || ['index', 'actions', 'operate', 'traceId', 'operationCount'].includes(String(column.key)))
      return [column];
    const key = String(column.key);
    const field = aliases[key] || key;
    if (rows.length ? !rows.some(row => Object.hasOwn(row, key)) : !fieldAllowed(policy?.read, field)) return [];
    return [
      {
        ...column,
        render: (row: Row, index: number) => {
          if (!Object.hasOwn(row, key)) return $t('fieldPolicy.unavailable');
          if ('render' in column && column.render) return column.render(row, index);
          const value: unknown = Reflect.get(row, key);
          return typeof value === 'string' || typeof value === 'number' ? value : '—';
        }
      }
    ];
  });
}
