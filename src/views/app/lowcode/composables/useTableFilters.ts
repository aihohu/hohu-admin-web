import { computed, reactive } from 'vue';

/** 系统字段一律不参与 filter 派生（与 TablePage.vue 的 SYSTEM_COLUMNS 一致） */
const SYSTEM_FIELDS = new Set(['id', 'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);

export type FilterOp = 'eq' | 'contains' | 'in' | 'gte' | 'lte' | 'has';

export interface FilterFieldDef {
  /** 后端列名，如 `name` */
  key: string;
  /** 显示标签，缺省为 key */
  label: string;
  /** 搜索表单的控件类型 */
  widget: 'NInput' | 'NSelect' | 'NInputNumberPair' | 'NDatePickerRange';
  /** 后端操作符；数组表示 gte/lte range 对 */
  op: FilterOp | ['gte', 'lte'];
  /** NSelect 控件的选项 */
  options?: { label: string; value: any }[];
}

/**
 * 按 data_schema + ui_schema 派生可过滤字段。
 * 系统字段跳过；manifest 可在 ui_schema[field].filter = false 显式禁用。
 *
 * 派生规则：
 *   string + enum       → NSelect + eq
 *   boolean             → NSelect + eq（是/否）
 *   integer/number      → NInputNumber pair + gte/lte
 *   string + date       → NDatePicker range + gte/lte
 *   array (JSONB)       → NInput + has（单值）
 *   string              → NInput + contains
 *   object              → 跳过
 */
export function deriveFilterFields(
  dataSchema: Record<string, any> | null,
  uiSchema: Record<string, any> = {}
): FilterFieldDef[] {
  if (!dataSchema?.properties) return [];
  const fields: FilterFieldDef[] = [];

  for (const [key, def] of Object.entries(dataSchema.properties)) {
    if (SYSTEM_FIELDS.has(key)) continue;
    const d = def as Record<string, any>;

    const override = uiSchema[key]?.filter;
    if (override === false) continue;

    const label = d.title || key;

    if (Array.isArray(d.enum) && d.enum.length) {
      fields.push({
        key,
        label,
        widget: 'NSelect',
        op: 'eq',
        options: d.enum.map((v: any) => ({ label: String(v), value: v }))
      });
    } else if (d.type === 'boolean') {
      fields.push({
        key,
        label,
        widget: 'NSelect',
        op: 'eq',
        options: [
          { label: '是', value: true },
          { label: '否', value: false }
        ]
      });
    } else if (d.type === 'integer' || d.type === 'number') {
      fields.push({ key, label, widget: 'NInputNumberPair', op: ['gte', 'lte'] });
    } else if (d.type === 'string' && (d.format === 'date' || d.format === 'date-time' || d.format === 'datetime')) {
      fields.push({ key, label, widget: 'NDatePickerRange', op: ['gte', 'lte'] });
    } else if (d.type === 'array') {
      fields.push({ key, label, widget: 'NInput', op: 'has' });
    } else if (d.type === 'string') {
      fields.push({ key, label, widget: 'NInput', op: 'contains' });
    }
    // object / null / 未知类型: 跳过
  }

  return fields;
}

/**
 * 把 reactive filter state 翻译成 fetchAppData 的 filters dict。
 * Range 字段（op 为 ['gte','lte']）的 state 形如 `{ gte?, lte? }`。
 */
export function buildFilters(state: Record<string, any>, fields: FilterFieldDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = state[f.key];
    if (v == null || v === '') continue;

    if (Array.isArray(f.op)) {
      const range = v as { gte?: any; lte?: any };
      if (range.gte != null && range.gte !== '') out[`${f.key}__gte`] = String(range.gte);
      if (range.lte != null && range.lte !== '') out[`${f.key}__lte`] = String(range.lte);
    } else if (f.op === 'eq') {
      out[f.key] = String(v);
    } else {
      out[`${f.key}__${f.op}`] = String(v);
    }
  }
  return out;
}

export function useTableFilters(dataSchema: Record<string, any> | null, uiSchema: Record<string, any> = {}) {
  const fields = computed(() => deriveFilterFields(dataSchema, uiSchema));
  const state = reactive<Record<string, any>>({});

  function reset() {
    Object.keys(state).forEach(k => {
      delete state[k];
    });
  }

  return { fields, state, reset };
}
