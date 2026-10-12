import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AccountLinks from '../account-links.vue';

vi.mock('@/locales', () => ({ $t: (key: string) => key }));

describe('account links reflect effective capabilities', () => {
  const stubs = { NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' } };
  it('preserves the footer without text or actions when self service is disabled', () => {
    const wrapper = mount(AccountLinks, { props: { registration: false, recovery: false }, global: { stubs } });
    expect(wrapper.find('div').exists()).toBe(true);
    expect(wrapper.text()).toBe('');
    expect(wrapper.find('button').exists()).toBe(false);
  });
  it('places recovery before registration and emits the selected destination', async () => {
    const wrapper = mount(AccountLinks, { props: { registration: true, recovery: true }, global: { stubs } });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toContain('forgetPassword');
    await buttons[0].trigger('click');
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['reset-pwd']);
  });
});
