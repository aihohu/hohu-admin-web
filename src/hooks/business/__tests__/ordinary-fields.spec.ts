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

describe('relation draft equality', () => {
  it('does not replace an unchanged array cloned from a server snapshot', () => {
    expect(
      editablePayload(
        { buttons: [{ code: 'system:user:list', desc: 'List' }] },
        { buttons: [{ code: 'system:user:list', desc: 'List' }] },
        ['buttons'],
        false,
        new Set(['buttons'])
      )
    ).toEqual({});
  });
  it('compares JSON object keys structurally while preserving array order', () => {
    expect(
      editablePayload(
        { query: [{ value: '1', key: 'mode' }] },
        { query: [{ key: 'mode', value: '1' }] },
        ['query'],
        false,
        new Set(['query'])
      )
    ).toEqual({});
    expect(
      editablePayload({ deptIds: ['2', '1'] }, { deptIds: ['1', '2'] }, ['dept_ids'], false, new Set(['deptIds']))
    ).toEqual({ deptIds: ['2', '1'] });
  });
});
