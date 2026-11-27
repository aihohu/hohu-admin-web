/** Pure editing helpers. Backend catalog/owner remains the authority. */
type Rule = Api.FieldManagement.Rule;
type Field = Api.FieldManagement.Field;
type Access = Api.FieldManagement.Access;
type Value = Api.FieldManagement.ChoiceValue;
export type PolicyTab = 'reading' | 'writing' | 'transfer';
export type PolicyUse =
  | 'read'
  | 'query'
  | 'create'
  | 'update'
  | 'importCreate'
  | 'importUpdate'
  | 'importMatch'
  | 'export';

export const policyGroups: { id: PolicyTab; uses: PolicyUse[] }[] = [
  { id: 'reading', uses: ['read', 'query'] },
  { id: 'writing', uses: ['create', 'update'] },
  { id: 'transfer', uses: ['importCreate', 'importUpdate', 'importMatch', 'export'] }
];

export function accessUse(access: Access): PolicyUse {
  if (access.purpose === 'import') {
    if (access.operation === 'create') return 'importCreate';
    if (['update', 'replace'].includes(access.operation)) return 'importUpdate';
    return 'importMatch';
  }
  if (access.operation === 'export') return 'export';
  if (access.operation === 'read') return 'read';
  if (access.operation === 'create') return 'create';
  if (['update', 'replace'].includes(access.operation)) return 'update';
  return 'query';
}

export function ruleKey(rule: { fieldId: string; access: Access }): string {
  return JSON.stringify([rule.fieldId, rule.access.operation, rule.access.purpose, rule.access.use]);
}

export function fingerprint(rules: readonly Rule[]) {
  return JSON.stringify(
    [...rules]
      .sort((a, b) => ruleKey(a).localeCompare(ruleKey(b)))
      .map(rule => [ruleKey(rule), rule.effect, rule.level, rule.maskId])
  );
}

export function ruleValue(rules: readonly Rule[], fieldId: string, access: Access): Value {
  const rule = rules.find(r => ruleKey(r) === ruleKey({ fieldId, access }));
  if (!rule) return 'unset';
  if (rule.effect === 'deny') return 'deny';
  return ['read', 'export'].includes(access.operation) ? rule.level : 'allow';
}

export function setRule(rules: readonly Rule[], field: Field, access: Access, value: Value): Rule[] {
  const key = ruleKey({ fieldId: field.fieldId, access });
  const choice = field.choices.find(c => ruleKey({ fieldId: field.fieldId, access: c.access }) === key);
  if (field.structural || !choice?.values.includes(value)) return [...rules];
  const result = rules.filter(r => ruleKey(r) !== key);
  if (value !== 'unset')
    result.push({
      fieldId: field.fieldId,
      access: { ...access },
      effect: value === 'deny' ? 'deny' : 'allow',
      level: value === 'masked' ? 'masked' : 'plain',
      maskId: value === 'masked' ? field.maskId : null
    });
  return result;
}

function allowedValue(values: Value[]): Value | undefined {
  return values.includes('masked')
    ? 'masked'
    : values.includes('plain')
      ? 'plain'
      : values.includes('allow')
        ? 'allow'
        : undefined;
}

export function applyBulk(
  initial: readonly Rule[],
  fields: readonly Field[],
  tab: PolicyTab,
  effect: 'allow' | 'deny'
) {
  let rules = [...initial];
  let count = 0;
  let changed = 0;
  let skipped = 0;
  let masked = 0;
  const uses = policyGroups.find(group => group.id === tab)?.uses ?? [];
  for (const field of fields) {
    for (const choice of field.choices.filter(c => uses.includes(accessUse(c.access)))) {
      count++;
      const value = effect === 'deny' ? 'deny' : allowedValue(choice.values);
      if (field.structural || !field.bulkEligible || !value || !choice.values.includes(value)) {
        skipped++;
        continue;
      }
      if (ruleValue(rules, field.fieldId, choice.access) === value) continue;
      rules = setRule(rules, field, choice.access, value);
      changed++;
      if (value === 'masked') masked++;
    }
  }
  return { rules, count, changed, skipped, masked };
}

export function recommendRules(initial: readonly Rule[], fields: readonly Field[]): Rule[] {
  let rules = [...initial];
  for (const field of fields) {
    if (field.structural || !field.bulkEligible) continue;
    for (const choice of field.choices) {
      const value = allowedValue(choice.values);
      if (
        choice.safeRecommendation &&
        ['read', 'query'].includes(accessUse(choice.access)) &&
        value &&
        ruleValue(rules, field.fieldId, choice.access) === 'unset'
      ) {
        rules = setRule(rules, field, choice.access, value);
      }
    }
  }
  return rules;
}
