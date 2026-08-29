import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const { toHome } = vi.hoisted(() => ({ toHome: vi.fn() }));

vi.mock('@/hooks/common/router', () => ({
  useRouterPush: () => ({ toHome })
}));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));

import ExceptionBase from '../exception-base.vue';

describe('ExceptionBase', () => {
  it('uses the constant root route when the scoped home route is unavailable', async () => {
    const wrapper = mount(ExceptionBase, {
      props: { type: '403' },
      global: {
        stubs: {
          SvgIcon: true,
          NButton: {
            emits: ['click'],
            template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
          }
        }
      }
    });

    await wrapper.get('button').trigger('click');

    expect(toHome).toHaveBeenCalledOnce();
  });
});
