import { defineAsyncComponent } from 'vue';

export const WIDGET_REGISTRY: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  NInput: defineAsyncComponent(() => import('./WidgetInput.vue')),
  NInputNumber: defineAsyncComponent(() => import('./WidgetNumber.vue')),
  NSelect: defineAsyncComponent(() => import('./WidgetSelect.vue')),
  NSwitch: defineAsyncComponent(() => import('./WidgetSwitch.vue')),
  NDatePicker: defineAsyncComponent(() => import('./WidgetDatePicker.vue')),
  NArray: defineAsyncComponent(() => import('./WidgetArray.vue')),
  NObject: defineAsyncComponent(() => import('./WidgetObject.vue')),
  NSelectBelongsTo: defineAsyncComponent(() => import('./WidgetSelectBelongsTo.vue'))
};

export function inferWidget(fieldDef: Record<string, any>): string {
  // BelongsTo relation (spec §6.5 / decision #79): field has x-ref → dropdown
  // populated from target table. Checked before type-based inference so
  // x-ref + integer falls into here rather than NInputNumber.
  if (fieldDef['x-ref']) return 'NSelectBelongsTo';
  const type = fieldDef.type;
  if (type === 'number' || type === 'integer') return 'NInputNumber';
  if (type === 'boolean') return 'NSwitch';
  if (type === 'array') return 'NArray';
  if (type === 'object') return 'NObject';
  if (type === 'string') {
    if (fieldDef.enum) return 'NSelect';
    if (fieldDef.format === 'date') return 'NDatePicker';
    if (fieldDef.format === 'date-time' || fieldDef.format === 'datetime') return 'NDatePicker';
    return 'NInput';
  }
  return 'NInput';
}
