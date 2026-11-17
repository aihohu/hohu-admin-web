import { effectScope } from 'vue';
import { describe, expect, it } from 'vitest';
import useTable from '~/packages/hooks/src/use-table';

describe('protected table response lifetime', () => {
  it('clears visible copies while revalidating and rejects late responses', async () => {
    const pending: ((value: string[]) => void)[] = [];
    const scope = effectScope();
    const table = scope.run(() =>
      useTable({
        immediate: false,
        api: () => new Promise<string[]>(resolve => pending.push(resolve)),
        transform: (rows: string[]) => rows,
        columns: () => [],
        getColumnChecks: () => [],
        getColumns: () => []
      })
    )!;
    table.data.value = ['old private copy'];
    const old = table.getData();
    expect(table.data.value).toEqual([]);
    const current = table.getData();
    pending[1](['current']);
    await current;
    pending[0](['revoked private copy']);
    await old;
    expect(table.data.value).toEqual(['current']);
    scope.stop();
  });
});
