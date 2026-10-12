import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import AccountForm from '../account-form.vue';

const mocks = vi.hoisted(() => ({ send: vi.fn(), submit: vi.fn(), navigate: vi.fn() }));
vi.mock('@/service/api/account', () => ({ sendAccountCode: mocks.send, submitAccount: mocks.submit }));
vi.mock('@/locales', () => ({
  $t: (key: string, args?: { minutes?: number }) => (args?.minutes ? `${key}:${args.minutes}` : key)
}));
vi.mock('@/hooks/common/router', () => ({ useRouterPush: () => ({ toggleLoginModule: mocks.navigate }) }));
vi.mock('@/hooks/common/form', () => ({
  useNaiveForm: () => ({ formRef: ref(), validate: async () => {} }),
  useFormRules: () => ({ formRules: { userName: [], pwd: [] }, createConfirmPwdRule: () => [] })
}));

const stubs = {
  NForm: { template: '<form><slot /></form>' },
  NFormItem: { template: '<div><slot /></div>' },
  NInput: {
    props: ['value'],
    emits: ['update:value'],
    template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />'
  },
  NButton: {
    props: ['attrType', 'disabled'],
    template: '<button :type="attrType || \'button\'" :disabled="disabled"><slot /></button>'
  },
  NAlert: { template: '<aside><slot /></aside>' }
};
const capabilities = { registrationEnabled: true, passwordResetEnabled: true, emailEnabled: true, codeMinutes: 10 };

describe('account self-service form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({ data: { expiresIn: 600, retryAfter: 60 }, error: null });
    mocks.submit.mockResolvedValue({ error: null });
  });
  it('does not expose a form while the selected capability is unavailable', () => {
    const wrapper = mount(AccountForm, { props: { purpose: 'register', capabilities: null }, global: { stubs } });
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('account.unavailable');
    wrapper.unmount();
  });
  it('sends a tenant-scoped recovery code and displays the actual duration', async () => {
    const wrapper = mount(AccountForm, {
      props: { purpose: 'reset', tenantCode: 'acme', capabilities },
      global: { stubs }
    });
    await wrapper.findAll('input')[0].setValue('alice');
    await wrapper.findAll('input')[1].setValue('alice@example.com');
    await wrapper.findAll('button')[0].trigger('click');
    await flushPromises();
    expect(mocks.send).toHaveBeenCalledWith({
      userName: 'alice',
      email: 'alice@example.com',
      tenantCode: 'acme',
      purpose: 'reset'
    });
    expect(wrapper.text()).toContain('account.recoverySent:10');
    expect(wrapper.findAll('button')[0].attributes('disabled')).toBeDefined();
    await wrapper.setProps({ tenantCode: 'other' });
    expect(wrapper.text()).not.toContain('account.recoverySent');
    wrapper.unmount();
  });
  it('returns to password login only after successful registration', async () => {
    const wrapper = mount(AccountForm, { props: { purpose: 'register', capabilities }, global: { stubs } });
    const fields = wrapper.findAll('input');
    for (const [index, value] of ['alice', 'alice@example.com', '123456', 'Password123', 'Password123'].entries())
      await fields[index].setValue(value);
    mocks.submit.mockResolvedValueOnce({ error: { message: 'invalid code' } });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mocks.navigate).not.toHaveBeenCalled();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mocks.submit).toHaveBeenLastCalledWith('register', {
      tenantCode: undefined,
      userName: 'alice',
      email: 'alice@example.com',
      code: '123456',
      password: 'Password123'
    });
    expect(mocks.navigate).toHaveBeenCalledWith('pwd-login');
    wrapper.unmount();
  });
});
