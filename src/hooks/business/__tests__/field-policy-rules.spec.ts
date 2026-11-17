import { describe, expect, it } from 'vitest';
import { applyBulk, recommendRules, ruleKey, setRule, fingerprint, accessUse } from '../field-policy-rules';

const read = { operation: 'read', purpose: 'management.read', use: '' };
const write = { operation: 'update', purpose: 'management.update', use: '' };
const field = {
  fieldId: 'user_email',
  maskId: 'email/v1',
  structural: false,
  bulkEligible: true,
  choices: [
    { access: read, values: ['unset', 'deny', 'masked', 'plain'], safeRecommendation: true },
    { access: write, values: ['unset', 'deny', 'allow'], safeRecommendation: false }
  ]
} as Api.FieldManagement.Field;

describe('catalog-constrained local bulk draft', () => {
  it('compares canonical rule values independent of JSON property order', () => {
    const original = setRule([], field, read, 'masked')[0];
    const reordered = {
      maskId: original.maskId,
      effect: original.effect,
      level: original.level,
      access: { use: '', purpose: 'management.read', operation: 'read' },
      fieldId: original.fieldId
    };
    expect(fingerprint([original])).toBe(fingerprint([reordered]));
    expect(accessUse({ operation: 'create', purpose: 'import', use: '' })).toBe('importCreate');
    expect(accessUse({ operation: 'replace', purpose: 'import', use: '' })).toBe('importUpdate');
    expect(accessUse({ operation: 'eq', purpose: 'import', use: 'match' })).toBe('importMatch');
  });
  it('defaults sensitive allow to masked and limits changes to current tab', () => {
    const result = applyBulk([], [field], 'reading', 'allow');
    expect(result.rules).toEqual([
      { fieldId: 'user_email', access: read, effect: 'allow', level: 'masked', maskId: 'email/v1' }
    ]);
    expect(result.masked).toBe(1);
    expect(result.changed).toBe(1);
  });
  it('keeps explicit deny on recommendation and never recommends writes', () => {
    const denied = setRule([], field, read, 'deny');
    expect(recommendRules(denied, [field])).toEqual(denied);
    expect(recommendRules([], [field])).toHaveLength(1);
  });
  it('skips structural and write-only secrets in bulk', () => {
    expect(
      applyBulk(
        [],
        [
          { ...field, structural: true },
          { ...field, bulkEligible: false }
        ],
        'writing',
        'allow'
      ).rules
    ).toEqual([]);
  });
  it('writes explicit denies and never mutates original or accepts unsupported grants', () => {
    const original = setRule([], field, read, 'masked');
    const changed = applyBulk(original, [field], 'reading', 'deny');
    expect(changed.rules[0].effect).toBe('deny');
    expect(original[0].effect).toBe('allow');
    expect(setRule(original, field, read, 'allow')).toEqual(original);
    expect(ruleKey(original[0])).toBe(
      ruleKey({ ...original[0], access: { use: '', purpose: 'management.read', operation: 'read' } })
    );
  });
});
