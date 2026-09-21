import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
const fetchImage = vi.hoisted(() => vi.fn());
vi.mock('@/service/api', () => ({ fetchChatImage: fetchImage }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
import ChatImage from '../chat-image.vue';

beforeEach(() => {
  fetchImage.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:authorized');
  URL.revokeObjectURL = vi.fn();
});

it('shows only an authenticated image blob and releases it on removal', async () => {
  fetchImage.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }), error: null });
  const wrapper = mount(ChatImage, { props: { src: '/uploads/private.png', alt: 'photo' } });
  await flushPromises();
  expect(fetchImage).toHaveBeenCalledWith('/uploads/private.png');
  expect(wrapper.get('img').attributes('src')).toBe('blob:authorized');
  wrapper.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:authorized');
});

it('does not display JSON errors as images or fall back to a public URL', async () => {
  fetchImage.mockResolvedValue({ data: new Blob(['denied'], { type: 'application/json' }), error: null });
  const wrapper = mount(ChatImage, { props: { src: '/uploads/private.png' } });
  await flushPromises();
  expect(wrapper.find('img').exists()).toBe(false);
  expect(wrapper.text()).toContain('page.ai.chat.imageUnavailable');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('discards an image that returns after its context was removed', async () => {
  let finish!: (value: unknown) => void;
  fetchImage.mockReturnValue(
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const wrapper = mount(ChatImage, { props: { src: '/uploads/private.png' } });
  wrapper.unmount();
  finish({ data: new Blob(['png'], { type: 'image/png' }), error: null });
  await flushPromises();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
