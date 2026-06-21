import { defineAsyncComponent } from 'vue';

export const WIDGET_REGISTRY: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  NInput: defineAsyncComponent(() => import('./WidgetInput.vue')),
  NInputNumber: defineAsyncComponent(() => import('./WidgetNumber.vue')),
  NSelect: defineAsyncComponent(() => import('./WidgetSelect.vue')),
  NSwitch: defineAsyncComponent(() => import('./WidgetSwitch.vue')),
  NDatePicker: defineAsyncComponent(() => import('./WidgetDatePicker.vue'))
};

export function inferWidget(fieldDef: Record<string, any>): string {
  const type = fieldDef.type;
  if (type === 'number' || type === 'integer') return 'NInputNumber';
  if (type === 'boolean') return 'NSwitch';
  if (type === 'string') {
    if (fieldDef.enum) return 'NSelect';
    if (fieldDef.format === 'date') return 'NDatePicker';
    if (fieldDef.format === 'date-time' || fieldDef.format === 'datetime') return 'NDatePicker';
    return 'NInput';
  }
  return 'NInput';
}
