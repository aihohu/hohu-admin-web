import { describe, expect, it, vi } from 'vitest';
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
import { deliveryColumns } from '../delivery-fields';

describe('delivery field projection', () => {
  it('hides wholly denied columns and marks per-record absence explicitly', () => {
    const cols = deliveryColumns([{ key: 'name' }, { key: 'secret' }, { key: 'actions' }], [{ name: 'Allowed' }, {}], {
      read: [],
      query: []
    });
    expect(cols.map(c => 'key' in c && c.key)).toEqual(['name', 'actions']);
    const first = cols[0];
    expect('render' in first && first.render?.({}, 1)).toBe('fieldPolicy.unavailable');
  });
});
