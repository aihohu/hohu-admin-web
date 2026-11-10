import { describe, expect, it } from 'vitest';
import { editablePayload, fieldAllowed } from '../ordinary-fields';

describe('ordinary field boundaries', () => {
  it('does not submit hidden values, identity fields or untouched defaults on update', () => {
    const before = { dictName: 'old', dictTypeId: '9007199254740997' };
    expect(
      editablePayload({ ...before, dictName: 'new', remark: '', status: '1' }, before, ['dict_name', 'remark'], false)
    ).toEqual({ dictName: 'new' });
  });
  it('has no permissive fallback while capabilities are missing', () => {
    expect(fieldAllowed(undefined, 'dictName')).toBe(false);
    expect(fieldAllowed(['dict_name'], 'dictName')).toBe(true);
  });
  it('allows an explicit write-only edit without filling other hidden defaults', () => {
    expect(
      editablePayload({ content: 'replacement', status: '1' }, {}, ['content', 'status'], false, new Set(['content']))
    ).toEqual({ content: 'replacement' });
    expect(editablePayload({ content: '' }, { content: null }, ['content'], false, new Set())).toEqual({});
  });
});
