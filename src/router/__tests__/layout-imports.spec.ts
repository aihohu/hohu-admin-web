import { describe, expect, it } from 'vitest';
import { layouts } from '../elegant/imports';

describe('router layout imports', () => {
  it('keeps generated layouts lazy to avoid the router-store initialization cycle', () => {
    expect(layouts.base).toBeTypeOf('function');
    expect(layouts.blank).toBeTypeOf('function');
  });
});
