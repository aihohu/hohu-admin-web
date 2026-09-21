import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PlatformPage from '../index.vue';

it('never renders an independent password form on the legacy route', () => {
  const wrapper = mount(PlatformPage);
  expect(wrapper.find('input').exists()).toBe(false);
  expect(wrapper.find('form').exists()).toBe(false);
  wrapper.unmount();
});
