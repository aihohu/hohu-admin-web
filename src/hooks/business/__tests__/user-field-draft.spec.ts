import { describe, expect, it } from 'vitest';
import { buildUserPatch, createUserDraft, fieldCapability, completeRelation } from '../user-field-draft';

const access = (read: 'plain' | 'masked' | 'hidden', update = true) => ({
  read,
  maskId: read === 'masked' ? 'phone/v1' : null,
  create: false,
  update,
  replace: false,
  queryOps: []
});

describe('user field draft', () => {
  it('keeps masks and omitted values out of replacement inputs and unchanged PATCH', () => {
    const source = {
      userPhone: '138****1234',
      nickname: null,
      fieldAccess: { userPhone: access('masked'), nickname: access('plain') }
    };
    const draft = createUserDraft(source, ['userPhone', 'userEmail', 'nickname']);
    expect(draft).toEqual({ userPhone: '', nickname: null });
    expect(buildUserPatch(source, draft, ['userPhone', 'userEmail', 'nickname'])).toEqual({});
    expect(buildUserPatch(source, { ...draft, userPhone: '13912345678' }, ['userPhone'])).toEqual({
      userPhone: '13912345678'
    });
  });
  it('preserves explicit null and does not write a missing field as null', () => {
    const source = { userPhone: '13912345678', fieldAccess: { userPhone: access('plain') } };
    expect(buildUserPatch(source, { userPhone: null, userEmail: null }, ['userPhone', 'userEmail'])).toEqual({
      userPhone: null
    });
  });
  it('allows a hidden write-only replacement without reading the supplied value', () => {
    const source = { userPhone: 'should never display', fieldAccess: { userPhone: access('hidden') } };
    expect(createUserDraft(source, ['userPhone'])).toEqual({ userPhone: '' });
    expect(buildUserPatch(source, { userPhone: '13912345678' }, ['userPhone'])).toEqual({ userPhone: '13912345678' });
  });
  it('never writes readonly, unknown or malformed metadata fields', () => {
    const source = { nickname: 'old', fieldAccess: { nickname: access('plain', false) } };
    expect(buildUserPatch(source, { nickname: 'new', password: 'secret' }, ['nickname'])).toEqual({});
    expect(fieldCapability({ fieldAccess: null }, 'nickname', 'update')).toBe(false);
    expect(fieldCapability({ fieldAccess: {} }, 'nickname', 'update')).toBe(false);
    expect(fieldCapability({ fieldAccess: { nickname: { update: true } } }, 'nickname', 'update')).toBe(false);
  });
  it('supports legacy response presence without inventing missing values', () => {
    const source = { nickname: 'old' };
    expect(buildUserPatch(source, { nickname: 'new', userPhone: '' }, ['nickname', 'userPhone'])).toEqual({
      nickname: 'new'
    });
  });
  it('requires a plain complete relation and all role candidates to resolve', () => {
    expect(
      completeRelation({ roles: ['A'], fieldAccess: { roles: { ...access('plain'), replace: true } } }, 'roles', ['A'])
    ).toBe(true);
    expect(completeRelation({ roles: ['A', 'B'] }, 'roles', ['A'])).toBe(false);
    expect(
      completeRelation({ roles: [], fieldAccess: { roles: { ...access('masked'), replace: true } } }, 'roles', [])
    ).toBe(false);
    expect(completeRelation({}, 'roles', [])).toBe(false);
  });
});
