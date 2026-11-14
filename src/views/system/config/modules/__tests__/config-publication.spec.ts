import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import Publication from '../config-publication.vue';

vi.mock('@/service/api', () => ({ publishConfig: vi.fn(), revokeConfigPublication: vi.fn() }));
vi.mock('@/locales', () => ({ $t: (key: string) => key }));
const stubs = {
  NSpace: { template: '<div><slot /></div>' },
  NAlert: { template: '<p><slot /></p>' },
  NButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
  NPopconfirm: {
    props: ['disabled'],
    emits: ['positive-click'],
    template:
      '<div><slot name="trigger" /><button class="confirm" :disabled="disabled" @click="$emit(\'positive-click\')">Confirm</button></div>'
  }
};
describe('independent configuration publication', () => {
  it('uses purpose-specific proofs and requires reload after an uncertain or rejected mutation', async () => {
    const { publishConfig, revokeConfigPublication } = await import('@/service/api');
    vi.mocked(publishConfig).mockResolvedValueOnce({ error: new Error('revision conflict') } as never);
    const wrapper = mount(Publication, {
      props: { configId: '1', publicationRevision: 'publish-only', revocationRevision: 'revoke-only', disabled: false },
      global: { stubs }
    });
    await wrapper.findAll('.confirm')[0].trigger('click');
    await flushPromises();
    expect(publishConfig).toHaveBeenCalledWith('1', 'publish-only');
    await wrapper.findAll('.confirm')[0].trigger('click');
    await wrapper.findAll('.confirm')[1].trigger('click');
    await flushPromises();
    expect(publishConfig).toHaveBeenCalledTimes(1);
    expect(revokeConfigPublication).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('fieldPolicy.publicationConflict');
    wrapper.unmount();
  });
});
