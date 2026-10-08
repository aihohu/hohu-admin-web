import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import PolicyDrawer from '../modules/policy-drawer.vue';

const api = vi.hoisted(() => ({ catalog: vi.fn(), save: vi.fn() }));
vi.mock('@/service/api', () => ({ fetchTenantModelCatalog: api.catalog, fetchSaveTenantPolicies: api.save }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
const container = defineComponent({ template: '<div><slot /><slot name="footer" /></div>' });
const input = defineComponent({
  props: ['value', 'disabled'],
  emits: ['update:value'],
  template: '<input :value="value" :disabled="disabled" @input="$emit(\'update:value\', $event.target.value)" />'
});
const toggle = defineComponent({
  props: ['value', 'disabled'],
  emits: ['update:value'],
  template:
    '<input type="checkbox" :checked="value" :disabled="disabled" @change="$emit(\'update:value\', $event.target.checked)" />'
});
const select = defineComponent({
  props: ['value', 'options'],
  emits: ['update:value'],
  template:
    '<select :value="value" @change="$emit(\'update:value\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>'
});
const models = [
  {
    modelId: '9007199254740993',
    providerId: '1',
    providerName: 'DeepSeek',
    modelName: 'first',
    capabilities: ['text'],
    enabled: false,
    isDefault: false,
    dailyQuotaPerUser: null,
    modelAvailable: true,
    unavailableReason: null
  },
  {
    modelId: '9007199254740994',
    providerId: '2',
    providerName: 'OpenAI',
    modelName: 'second',
    capabilities: ['text'],
    enabled: false,
    isDefault: false,
    dailyQuotaPerUser: null,
    modelAvailable: true,
    unavailableReason: null
  },
  {
    modelId: '9007199254740995',
    providerId: '2',
    providerName: 'OpenAI',
    modelName: 'image-only',
    capabilities: ['image'],
    enabled: false,
    isDefault: false,
    dailyQuotaPerUser: null,
    modelAvailable: false,
    unavailableReason: 'text_required'
  }
];
function render() {
  return mount(PolicyDrawer, {
    props: { show: true, tenantId: '0', tenantName: 'Default Tenant' },
    global: {
      stubs: {
        NDrawer: container,
        NDrawerContent: container,
        NSpace: container,
        NAlert: container,
        NTag: container,
        NSpin: container,
        NTable: container,
        NEmpty: container,
        NButton: defineComponent({
          props: ['disabled', 'loading'],
          template: '<button :disabled="disabled || loading"><slot /></button>'
        }),
        NInput: input,
        NSelect: select,
        NSwitch: toggle,
        NInputNumber: input
      }
    }
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  api.catalog.mockResolvedValue({ data: { models: structuredClone(models), revision: 'a'.repeat(64) } });
  api.save.mockResolvedValue({ data: {} });
});
it('saves multiple models with one default in one request, including filtered-out drafts', async () => {
  const page = render();
  await flushPromises();
  const rows = page.findAll('tbody tr');
  await rows[0].find('input[type="checkbox"]').setValue(true);
  await rows[1].find('input[type="checkbox"]').setValue(true);
  await rows[1].find('input[type="radio"]').setValue();
  await page.find('input[aria-label="searchModels"]').setValue('first');
  expect(page.findAll('tbody tr')).toHaveLength(1);
  await page
    .findAll('button')
    .find(b => b.text() === 'saveChanges')!
    .trigger('click');
  await flushPromises();
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(api.save).toHaveBeenCalledWith('0', {
    revision: 'a'.repeat(64),
    policies: models.map((m, i) => ({
      modelId: m.modelId,
      enabled: i < 2,
      isDefault: i === 1,
      dailyQuotaPerUser: null
    }))
  });
  expect(page.emitted('update:show')).toEqual([[false]]);
});
it('requires an available default and keeps drafts after failed save', async () => {
  api.save.mockResolvedValue({ error: new Error('conflict') });
  const page = render();
  await flushPromises();
  const rows = page.findAll('tbody tr');
  expect(rows[2].find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
  await rows[0].find('input[type="checkbox"]').setValue(true);
  const save = page.findAll('button').find(b => b.text() === 'saveChanges')!;
  expect(save.attributes('disabled')).toBeDefined();
  await rows[0].find('input[type="radio"]').setValue();
  await save.trigger('click');
  await flushPromises();
  expect(page.text()).toContain('saveFailed');
  expect(rows[0].find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true);
  expect(page.emitted('update:show')).toBeUndefined();
});
it('blocks saving on load failure and supports retry', async () => {
  api.catalog.mockResolvedValueOnce({ error: new Error('offline') });
  const page = render();
  await flushPromises();
  expect(page.text()).toContain('catalogFailed');
  expect(
    page
      .findAll('button')
      .find(b => b.text() === 'saveChanges')!
      .attributes('disabled')
  ).toBeDefined();
  await page
    .findAll('button')
    .find(b => b.text() === 'reload')!
    .trigger('click');
  await flushPromises();
  expect(page.findAll('tbody tr')).toHaveLength(3);
});

it('clears a revoked default and requires a replacement', async () => {
  const page = render();
  await flushPromises();
  const rows = page.findAll('tbody tr');
  await rows[0].find('input[type="checkbox"]').setValue(true);
  await rows[1].find('input[type="checkbox"]').setValue(true);
  await rows[0].find('input[type="radio"]').setValue();
  await rows[0].find('input[type="checkbox"]').setValue(false);
  expect(rows[0].find<HTMLInputElement>('input[type="radio"]').element.checked).toBe(false);
  expect(
    page
      .findAll('button')
      .find(b => b.text() === 'saveChanges')!
      .attributes('disabled')
  ).toBeDefined();
  await rows[1].find('input[type="radio"]').setValue();
  expect(
    page
      .findAll('button')
      .find(b => b.text() === 'saveChanges')!
      .attributes('disabled')
  ).toBeUndefined();
});

it('filters providers and authorization independently without dropping edits', async () => {
  const page = render();
  await flushPromises();
  await page.findAll('tbody tr')[1].find('input[type="checkbox"]').setValue(true);
  await page.findAll('select')[0].setValue('2');
  expect(page.findAll('tbody tr')).toHaveLength(2);
  await page.findAll('select')[1].setValue('enabled');
  expect(page.findAll('tbody tr')).toHaveLength(1);
  expect(page.find('tbody tr').text()).toContain('second');
});

it('confirms discarding edits and disabling every model', async () => {
  const warning = vi.fn();
  window.$dialog = { warning } as unknown as NonNullable<Window['$dialog']>;
  api.catalog.mockResolvedValue({
    data: { models: [{ ...models[0], enabled: true, isDefault: true }], revision: 'a'.repeat(64) }
  });
  const page = render();
  await flushPromises();
  await page.find('input[type="checkbox"]').setValue(false);
  await page
    .findAll('button')
    .find(b => b.text() === 'cancel')!
    .trigger('click');
  expect(warning.mock.calls[0][0].title).toBe('unsavedTitle');
  expect(page.emitted('update:show')).toBeUndefined();
  await page
    .findAll('button')
    .find(b => b.text() === 'saveChanges')!
    .trigger('click');
  expect(api.save).not.toHaveBeenCalled();
  await warning.mock.calls[1][0].onPositiveClick();
  expect(api.save).toHaveBeenCalledWith('0', {
    revision: 'a'.repeat(64),
    policies: [{ modelId: models[0].modelId, enabled: false, isDefault: false, dailyQuotaPerUser: null }]
  });
  delete window.$dialog;
});
