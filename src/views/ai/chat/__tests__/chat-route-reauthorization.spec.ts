import { KeepAlive, defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChatPage from '../index.vue';

const init = vi.fn().mockResolvedValue(undefined);

vi.mock('@/store/modules/ai', () => ({
  useAiStore: () => ({ init })
}));

describe('AI chat route reauthorization', () => {
  it('initializes once on mount and again when a cached route is reactivated', async () => {
    const showChat = ref(true);
    const Host = defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () => (showChat.value ? h(ChatPage, { key: 'chat' }) : h(defineComponent(() => () => h('div'))))
        })
    });
    mount(Host, {
      global: {
        stubs: {
          ChatSidebar: true,
          ChatMain: true
        }
      }
    });
    await nextTick();
    expect(init).toHaveBeenCalledTimes(1);

    showChat.value = false;
    await nextTick();
    showChat.value = true;
    await nextTick();

    expect(init).toHaveBeenCalledTimes(2);
  });
});
