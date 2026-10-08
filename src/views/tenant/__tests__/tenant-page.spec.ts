import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import TenantPage from '../index.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  bootstrap: vi.fn(),
  status: vi.fn(),
  models: vi.fn(),
  policies: vi.fn(),
  savePolicy: vi.fn(),
  catalog: vi.fn(),
  systemAdmin: true
}));
vi.mock('@/store/modules/auth', () => ({ useAuthStore: () => ({ userInfo: { isSystemAdmin: api.systemAdmin } }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/service/api', () => ({
  fetchAgentModelOptions: api.models,
  fetchTenantList: api.list,
  fetchCreateTenant: api.create,
  fetchBootstrapTenant: api.bootstrap,
  fetchTenantStatus: api.status,
  fetchTenantPolicies: api.policies,
  fetchSaveTenantPolicy: api.savePolicy,
  fetchTenantModelCatalog: api.catalog,
  fetchSaveTenantPolicies: api.savePolicy
}));

const container = defineComponent({ template: '<div><slot /><slot name="footer" /></div>' });
const button = defineComponent({
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled || loading"><slot /></button>'
});
const input = defineComponent({
  props: ['value'],
  emits: ['update:value'],
  template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
});
const modal = defineComponent({ props: ['show'], template: '<section v-if="show"><slot /></section>' });
const select = defineComponent({
  props: ['value', 'options'],
  emits: ['update:value'],
  template:
    '<select :value="value" @change="$emit(\'update:value\', $event.target.value)">' +
    '<option value="">Select</option>' +
    '<option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>' +
    '</select>'
});
const toggle = defineComponent({
  props: ['value', 'disabled'],
  emits: ['update:value'],
  template:
    '<input type="checkbox" :checked="value" :disabled="disabled" ' +
    '@change="$emit(\'update:value\', $event.target.checked)" />'
});
function render() {
  return mount(TenantPage, {
    global: {
      stubs: {
        NCard: container,
        NSpace: container,
        NAlert: container,
        NForm: container,
        NFormItem: container,
        NTag: container,
        NTable: container,
        NButton: button,
        NInput: input,
        NSelect: select,
        NSwitch: toggle,
        NInputNumber: true,
        NModal: modal,
        NDrawer: modal,
        NDrawerContent: container,
        NSpin: container,
        NEmpty: container,
        NPagination: true
      }
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.systemAdmin = true;
  api.list.mockResolvedValue({ data: { records: [], total: 0 } });
  api.models.mockResolvedValue({ data: [] });
  api.policies.mockResolvedValue({ data: [] });
  api.catalog.mockResolvedValue({ data: { models: [], revision: 'a'.repeat(64) } });
  api.savePolicy.mockResolvedValue({ data: {} });
});

it('denies tenant administrators without requesting the global registry', async () => {
  api.systemAdmin = false;
  const page = render();
  await flushPromises();
  expect(page.text()).toContain('noAccess');
  expect(api.list).not.toHaveBeenCalled();
});

it('retains failed creation inputs and retries with the same idempotency key', async () => {
  api.create.mockResolvedValueOnce({ error: new Error('temporary failure') }).mockResolvedValueOnce({ data: {} });
  const page = render();
  await flushPromises();
  await page
    .findAll('button')
    .find(item => item.text() === 'create')!
    .trigger('click');
  const inputs = page.findAll('input');
  await inputs[0].setValue('Acme');
  await inputs[1].setValue('acme-test');
  await page
    .findAll('button')
    .find(item => item.text() === 'save')!
    .trigger('click');
  await flushPromises();
  expect(page.findAll('input')[0].element.value).toBe('Acme');
  await page
    .findAll('button')
    .find(item => item.text() === 'save')!
    .trigger('click');
  await flushPromises();
  expect(api.create).toHaveBeenCalledTimes(2);
  expect(api.create.mock.calls[0]).toEqual(api.create.mock.calls[1]);
  expect(api.list).toHaveBeenCalledTimes(2);
  expect(page.find('section').exists()).toBe(false);
});

it('lets the system administrator authorize a model for the default tenant without lifecycle actions', async () => {
  api.list.mockResolvedValue({
    data: {
      records: [
        {
          tenantId: '0',
          tenantCode: 'default',
          tenantName: 'Default Tenant',
          enabled: true,
          lifecycleState: 'active',
          bootstrapStatus: 'ready'
        }
      ],
      total: 1
    }
  });
  const modelId = '9007199254740993';
  api.models.mockResolvedValue({
    data: [{ modelId, label: 'DeepSeek / model', capabilities: ['text'] }]
  });
  api.catalog.mockResolvedValue({
    data: {
      revision: 'a'.repeat(64),
      models: [
        {
          modelId,
          modelName: 'model',
          providerId: '1',
          providerName: 'DeepSeek',
          enabled: false,
          isDefault: false,
          dailyQuotaPerUser: null,
          modelAvailable: true,
          unavailableReason: null
        }
      ]
    }
  });
  const page = render();
  await flushPromises();
  const row = page.find('tbody tr');
  expect(page.findAll('th').map(item => item.text())).toEqual(['name', 'code', 'status', 'policies', 'action']);
  const cells = row.findAll('td');
  expect(cells[3].find('button').text()).toBe('authorize');
  expect(cells[4].text()).toBe('—');
  expect(cells[4].find('button').exists()).toBe(false);
  await cells[3].find('button').trigger('click');
  await flushPromises();
  expect(api.catalog).toHaveBeenCalledWith('0');
  await page.find('input[type="checkbox"]').setValue(true);
  await page.find('input[type="radio"]').setValue();
  await page
    .findAll('button')
    .find(item => item.text() === 'saveChanges')!
    .trigger('click');
  await flushPromises();
  expect(api.savePolicy).toHaveBeenCalledWith('0', {
    revision: 'a'.repeat(64),
    policies: [{ modelId, enabled: true, isDefault: true, dailyQuotaPerUser: null }]
  });
  expect(api.bootstrap).not.toHaveBeenCalled();
  expect(api.status).not.toHaveBeenCalled();
  expect(page.find('section').exists()).toBe(false);
});

it('separates business tenant AI authorization from lifecycle actions and requires initialization', async () => {
  api.list.mockResolvedValue({
    data: {
      records: [
        {
          tenantId: '9007199254740993',
          tenantCode: 'active',
          tenantName: 'Active Tenant',
          enabled: true,
          lifecycleState: 'active',
          bootstrapStatus: 'ready'
        },
        {
          tenantId: '9007199254740994',
          tenantCode: 'prepared',
          tenantName: 'Prepared Tenant',
          enabled: false,
          lifecycleState: 'prepared',
          bootstrapStatus: 'ready'
        },
        {
          tenantId: '9007199254740995',
          tenantCode: 'pending',
          tenantName: 'Pending Tenant',
          enabled: false,
          lifecycleState: 'prepared',
          bootstrapStatus: 'pending'
        }
      ],
      total: 3
    }
  });
  const page = render();
  await flushPromises();
  const rows = page.findAll('tbody tr');
  const active = rows[0].findAll('td');
  const prepared = rows[1].findAll('td');
  const pending = rows[2].findAll('td');
  expect(active[3].find('button').text()).toBe('authorize');
  expect(active[4].findAll('button').map(item => item.text())).toEqual(['disable']);
  expect(prepared[3].find('button').text()).toBe('authorize');
  expect(prepared[4].findAll('button').map(item => item.text())).toEqual(['activate']);
  expect(pending[3].text()).toBe('authorizeAfterBootstrap');
  expect(pending[3].find('button').exists()).toBe(false);
  expect(pending[4].findAll('button').map(item => item.text())).toEqual(['bootstrap']);
  await active[3].find('button').trigger('click');
  await flushPromises();
  expect(api.catalog).toHaveBeenCalledWith('9007199254740993');
  expect(api.bootstrap).not.toHaveBeenCalled();
  expect(api.status).not.toHaveBeenCalled();
});
