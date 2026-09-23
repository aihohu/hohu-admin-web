import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import TenantPage from '../index.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  bootstrap: vi.fn(),
  status: vi.fn(),
  policies: vi.fn(),
  savePolicy: vi.fn(),
  systemAdmin: true
}));
vi.mock('@/store/modules/auth', () => ({ useAuthStore: () => ({ userInfo: { isSystemAdmin: api.systemAdmin } }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('@/service/api', () => ({
  fetchAgentModelOptions: vi.fn().mockResolvedValue({ data: [] }),
  fetchTenantList: api.list,
  fetchCreateTenant: api.create,
  fetchBootstrapTenant: api.bootstrap,
  fetchTenantStatus: api.status,
  fetchTenantPolicies: api.policies,
  fetchSaveTenantPolicy: api.savePolicy
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
        NModal: modal,
        NPagination: true
      }
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.systemAdmin = true;
  api.list.mockResolvedValue({ data: { records: [], total: 0 } });
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
